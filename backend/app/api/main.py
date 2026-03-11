import asyncio
import json
import logging
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Set
from app.simulation.manager import SimulationManager
from app.simulation.models import AntPacket

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Anthill Simulation API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulation state
manager = SimulationManager()
active_connections: Set[WebSocket] = set()

async def simulation_loop():
    """
    Main simulation loop running at 60Hz for physics, 
    but broadcasting at 10Hz for networking.
    """
    dt = 1/60.0
    broadcast_interval = 0.1  # 10Hz
    last_broadcast = 0.0
    
    while True:
        try:
            # 1. Update simulation physics
            manager.update(dt)
            
            # 2. Check if it's time to broadcast (10Hz)
            if manager.current_time - last_broadcast >= broadcast_interval:
                if active_connections:
                    packet = manager.get_packet()
                    # Convert to JSON once for all clients
                    payload = packet.model_dump_json()
                    
                    # Fire-and-forget broadcast
                    disconnected = []
                    for connection in active_connections:
                        try:
                            await connection.send_text(payload)
                        except Exception:
                            disconnected.append(connection)
                    
                    # Cleanup disconnected clients
                    for connection in disconnected:
                        active_connections.remove(connection)
                
                last_broadcast = manager.current_time
                
            # 3. Sleep to maintain 60Hz
            await asyncio.sleep(dt)
            
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    # Start the simulation loop as a background task
    asyncio.create_task(simulation_loop())

@app.get("/health")
async def health_check():
    return {"status": "ok", "ants": int(np.sum(manager.colony[:, 6] == 1))}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    
    try:
        # 1. Send Full World Snapshot (160x120 grid)
        # Spec says: Full world snapshot (160x120 grid) followed by 10Hz delta stream.
        snapshot = {
            "type": "snapshot",
            "grid": manager.world.grid.tolist()
        }
        await websocket.send_text(json.dumps(snapshot))
        
        # 2. Keep connection alive and listen for any messages
        while True:
            # For now, we don't expect client messages, but we need to keep the loop open
            # and detect disconnection.
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
