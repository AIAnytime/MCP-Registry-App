#!/usr/bin/env python3
"""
Startup script for MCP Search App
Runs both FastAPI backend and React frontend
"""

import subprocess
import sys
import time
import threading
from pathlib import Path

def run_backend():
    """Run the FastAPI backend"""
    print("🚀 Starting FastAPI backend...")
    project_root = Path(__file__).parent
    subprocess.run([
        "uv", "run", "uvicorn", "backend.main:app", 
        "--host", "0.0.0.0", "--port", "8000", "--reload"
    ], cwd=project_root)

def run_frontend():
    """Run the React frontend"""
    print("⚡ Starting React frontend...")
    frontend_path = Path(__file__).parent / "frontend"
    subprocess.run(["npm", "run", "dev"], cwd=frontend_path)

def main():
    print("🔧 Starting MCP Search App...")
    print("Backend will run on: http://localhost:8000")
    print("Frontend will run on: http://localhost:5173")
    print("Press Ctrl+C to stop both servers\n")
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # Give backend time to start
    time.sleep(2)
    
    # Start frontend (this will block)
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n👋 Shutting down servers...")
        sys.exit(0)

if __name__ == "__main__":
    main()
