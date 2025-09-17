from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
from typing import List, Dict, Any, Optional
import asyncio
from pathlib import Path

app = FastAPI(title="MCP Server Registry Search", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MCP Registry API base URL
MCP_REGISTRY_BASE_URL = "https://registry.modelcontextprotocol.io"

# Cache for servers data
servers_cache = []
cache_timestamp = 0

async def fetch_servers_from_registry() -> List[Dict[str, Any]]:
    """Fetch servers from MCP registry API"""
    global servers_cache, cache_timestamp
    
    # Simple cache mechanism (cache for 5 minutes)
    import time
    current_time = time.time()
    if servers_cache and (current_time - cache_timestamp) < 300:
        return servers_cache
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{MCP_REGISTRY_BASE_URL}/v0/servers")
            response.raise_for_status()
            data = response.json()
            
            # Filter only active servers
            active_servers = [
                server for server in data.get("servers", [])
                if server.get("status") == "active"
            ]
            
            servers_cache = active_servers
            cache_timestamp = current_time
            return active_servers
            
    except Exception as e:
        print(f"Error fetching servers: {e}")
        # Return cached data if available, otherwise empty list
        return servers_cache if servers_cache else []

@app.get("/api/servers")
async def get_servers(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(5, ge=1, le=20, description="Number of servers per page"),
    search: Optional[str] = Query(None, description="Search query")
):
    """Get paginated list of MCP servers with optional search"""
    try:
        servers = await fetch_servers_from_registry()
        
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            servers = [
                server for server in servers
                if (search_lower in server.get("name", "").lower() or
                    search_lower in server.get("description", "").lower())
            ]
        
        # Calculate pagination
        total_servers = len(servers)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_servers = servers[start_idx:end_idx]
        
        total_pages = (total_servers + limit - 1) // limit
        
        return {
            "servers": paginated_servers,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_servers": total_servers,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching servers: {str(e)}")

@app.get("/api/servers/{server_id}")
async def get_server_details(server_id: str):
    """Get detailed information about a specific server"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{MCP_REGISTRY_BASE_URL}/v0/servers/{server_id}")
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Server not found")
        raise HTTPException(status_code=500, detail="Error fetching server details")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching server details: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "MCP Server Registry API is running"}

# Serve React static files
frontend_path = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_path.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_path / "static")), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React app for all routes"""
        index_file = frontend_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"message": "Frontend not built yet"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
