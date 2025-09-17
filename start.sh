#!/bin/bash

echo "🔧 Starting MCP Search App..."
echo "Backend will run on: http://localhost:8000"
echo "Frontend will run on: http://localhost:5173"
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend in background
echo "🚀 Starting FastAPI backend..."
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Give backend time to start
sleep 2

# Start frontend
echo "⚡ Starting React frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
