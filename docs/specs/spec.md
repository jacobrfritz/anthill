# Technical Specification: Anthill Simulation (MVP)

## 1. Overview
Anthill is a high-performance "Distributed Simulation" where a Python backend handles the mathematical modeling (Discrete Event Simulation) and a browser-based frontend handles the visual rendering. This project applies probabilistic modeling (ISYE 6644) to agent-based simulation.

## 2. System Architecture

### 2.1 Backend: Python (The "Brain")
- **Role**: Mathematical engine. Entities transition between states based on Discrete Distributions.
- **Data Architecture (The Colony Matrix - "Static Slots")**:
    - **Representation**: A single contiguous NumPy matrix `S` of shape `(500, 7)`.
    - **Schema**: Each row represents a fixed "slot" for an ant: `[x, y, theta, state, timer, age, active]`.
    - **Identity**: The row index `i` is the permanent ID. The frontend uses this index to bind sprites to data rows, ensuring smooth interpolation without teleporting.
    - **Active Flag**: `active=1` means the ant is in the world; `active=0` means the slot is empty (dead or not yet spawned).
- **Environmental State (The World)**:
    - **Representation**: Managed by a `World` class containing a 2D NumPy grid (`160x120`) of `int8` values.
    - **States**: `0` (Air/Tunnel), `1` (Dirt).
    - **Coordinate Mapping (The 5:1 Rule)**:
        - **Terrarium**: 800px x 600px.
        - **Grid**: 160 x 120 cells.
        - **Scale**: `GRID_SCALE = 5`.
    - **Responsibilities**:
        - **Collision Detection**: `is_dirt(x, y)` checks if pixel coordinates map to a dirt cell.
        - **Modification**: `clear_dirt(x, y)` marks a cell as tunnel and tracks it in a `deltas` list. **CRITICAL**: The `deltas` list must be cleared after every network broadcast to prevent a memory leak.
- **World Generator**:
    - **Initial State**: The top 15% of the grid is initialized as "Air" (`0`).
    - **Spawn Mounds**: Three fixed entry points located at the "Grass Line" (`y=80`) at `x=160, 400, 640`. (Note: Spawning occurs slightly above the dirt to prevent immediate collision traps).
- **Probabilistic Modeling**:
    - **Spawning**: Ants arrive via a **Poisson Process**. To spawn, the engine finds the first row where `active == 0` and `age == 0` (to ensure it's not a "dead" slot). 
    - **Capacity**: Total lifetime spawns are capped at 500. Once all 500 rows have `age > 0` and `active == 0`, no more spawning occurs.
    - **Lifespan**: Total life $X \sim N(1000, 50)$ seconds. When `age > lifespan`, `active` is set to `0`.
    - **Simulation End**: The simulation terminates when the `active` count is 0 and all 500 available slots have been exhausted (all ants have lived and died).
    - **State Transitions**: When an ant's `timer` (Column 4) hits zero, it draws a new **Duration** $D$ from a distribution (e.g., Digging $\sim \text{Uniform}(5, 15)$ seconds).
- **Core Logic**:
    - **State Machine**:
        - `0`: Wandering
        - `1`: Digging (Directional Lock: Ant maintains heading with minimal noise to create straight tunnels).
        - `2`: Foraging
    - **Vectorized Movement Math**:
        - **Masking**: All movement and logic updates use the `active == 1` mask.
        - **Smooth Steering**: Instead of random heading jumps, ants apply a small `angular_velocity` to `theta` each frame for curved, organic movement.
        - **The Follower Rule (Emergent Behavior)**: A "Scent Grid" (`160x120`) tracks where ants have passed. Wandering ants have a 60% probability to bias their steering toward the highest scent in their forward arc. 
        - **Position Update**: 
            - `S[mask, 0] += np.cos(S[mask, 2]) * speed * dt`
            - `S[mask, 1] += np.sin(S[mask, 2]) * speed * dt`
            - **Boundary Handling**: Use `np.clip` on columns 0 and 1 to keep ants within `[0, 800]` and `[0, 600]`.
        - **Vectorized Collision**: Use the colony matrix to index the world grid: `grid[(S[mask,0]//5).astype(int), (S[mask,1]//5).astype(int)]`.
- **Simulation Manager Snippet**:
```python
import numpy as np

class SimulationManager:
    def __init__(self, n_ants=500):
        self.world = World()
        self.colony = np.zeros((n_ants, 7)) # [x, y, theta, state, timer, age, active]
        self.speed = 2.0

    def update(self, dt):
        mask = self.colony[:, 6] == 1
        if not np.any(mask): return # Handle spawning or end-state

        # 1. Aging & Timers
        self.colony[mask, 5] += dt 
        self.colony[mask, 4] -= dt 

        # 2. Update positions & Clamp
        self.colony[mask, 0] += np.cos(self.colony[mask, 2]) * self.speed * dt
        self.colony[mask, 1] += np.sin(self.colony[mask, 2]) * self.speed * dt
        self.colony[mask, 0] = np.clip(self.colony[mask, 0], 0, 799)
        self.colony[mask, 1] = np.clip(self.colony[mask, 1], 0, 599)

        # 3. Vectorized Collision Detection
        gxs = (self.colony[mask, 0] // 5).astype(int)
        gys = (self.colony[mask, 1] // 5).astype(int)
        
        is_dirt = self.world.grid[gxs, gys] == 1
        colliding = is_dirt & (self.colony[mask, 3] != 1)
        
        # Apply collision response only to colliding active ants
        indices = np.where(mask)[0][colliding]
        self.colony[indices, 2] += np.pi 
        self.colony[indices, 0] += np.cos(self.colony[indices, 2]) * 5.0
        self.colony[indices, 1] += np.sin(self.colony[indices, 2]) * 5.0
```

### 2.2 Communication Protocol: FastAPI WebSockets
- **Role**: Bi-directional, low-latency stream.
- **Tech**: FastAPI + `uvicorn`.
- **Concurrency**: Asynchronous event loop handles 500+ ant updates at **10Hz** (10 packets per second).
- **Interpolation Strategy (Option B - Smooth Visuals)**: 
    - **Logic**: To maintain a "smooth" 60FPS visual experience, the PixiJS frontend will treat the 10Hz packets as "keyframes." 
    - **The 100ms Buffer**: The frontend maintains a small buffer of the two most recent packets (`Packet_A` and `Packet_B`). 
    - **Rendering in the Past**: The renderer displays the state at `Time = Now - 100ms`. It linearly interpolates (Lerps) the position of each ant between `Packet_A` and `Packet_B` based on the elapsed time since the last packet was received.
    - **Benefit**: This ensures that even if a packet arrives slightly late (jitter), the movement remains perfectly fluid without teleporting.
- **Non-Blocking Broadcast**: The simulation loop must not wait for slow network clients. Broadcasts should be "fire-and-forget" to ensure the engine remains performant.
- **Network Efficiency**: This low-frequency approach significantly reduces CPU usage on the Raspberry Pi and prevents network congestion while maintaining a polished, cartoony feel.
- **Late-Joiner Synchronization**: When a client first connects, the backend sends a **Full World Snapshot** (the 160x120 grid) before transitioning to incremental `deltas`. This ensures users who join mid-simulation see the already-dug tunnels.

### 2.3 Frontend: PixiJS (The "Terrarium")
- **Role**: High-speed GPU-accelerated rendering.
- **Stack**: TypeScript + PixiJS (WebGL).
- **Asset Loading vs. Packet Flow**: To prevent crashes or jitter, the frontend uses a `Ready` flag. The WebSocket listener buffers incoming ant packets but **does not start rendering** until all textures (ant sprites, background layers) have successfully finished loading via the PixiJS `Assets` loader.
- **Visual Aesthetic (Mario-Style)**:
    - **Palette**: 
        - **Sky**: Light Blue (#5C94FC) for the top 15%.
        - **Grass**: A bright green line (#76C442) separating Air and Dirt.
        - **Dirt**: Deep Brown (#8B4513) for the remaining 85%.
        - **Ants**: Small black or red sprites.
    - **Ants**: 16x16 animated sprites. 
        - **Animations**: Simple 2-frame walk cycle.
        - **Rotation**: Ants are rotated to match the `theta` value provided in the network packet.
        - **Z-Ordering**: Ants walk on top and are rendered over each other based on their index in the packet.
    - **Digging**: As `deltas` arrive, the frontend clears the corresponding 5x5 pixel area in the "Dirt" layer to reveal a lighter "Tunnel" color or the background.
    - **Camera**: Fixed-view "Side-Scroller" perspective.

## 3. Data Structure (The "Packet")
To ensure visual smoothness and proper rotation with 500 ants at 10Hz, packets include the heading ($\theta$) and the `active` flag:
```json
{
  "t": 14502,
  "ants": [120, 45, 1.57, 1, 1, 302, 110, 3.14, 0, 0], // [x1, y1, theta1, state1, active1, x2, y2, theta2, state2, active2...]
  "deltas": [[10, 20], [10, 21]]      // [gx, gy] coordinates of newly cleared dirt
}
```
> **Performance Note**: JSON is the baseline for the MVP. If Raspberry Pi CPU usage becomes a bottleneck, the protocol should transition to **Binary Serialization** (using Python `struct` and JS `ArrayBuffer`).

## 4. Data Contract & Parallel Strategy

### 4.1 The Network Contract (The "Pipe")
To enable parallel development, both the Backend and Frontend will build against this fixed schema.

**Backend (Python/Pydantic):**
```python
from pydantic import BaseModel
from typing import List, Tuple

class AntPacket(BaseModel):
    t: int                # Server timestamp (ms)
    ants: List[float]     # Flattened: [x1, y1, theta1, state1, active1, x2, y2...]
    deltas: List[Tuple[int, int]] # List of [gx, gy] coordinates to clear
```

**Frontend (TypeScript/Interfaces):**
```typescript
interface AntPacket {
  t: number;
  ants: number[];         // Flattened array for high-speed iteration
  deltas: [number, number][]; // [gx, gy][]
}
```

### 4.2 Parallel Implementation Strategy

#### Workstream A: The Brain (Python/NumPy)
- **Goal**: Implement the `SimulationManager` and `World` logic.
- **Tasks**:
    1. **Environment Setup**: Initialize Python project with `venv`, `ruff`, `mypy`, and `pytest`.
    2. **World Logic**: Implement the `World` class with a 160x120 NumPy grid and delta tracking.
    3. **Colony Foundation**: Create the `SimulationManager` and the 500x7 Colony Matrix.
    4. **Probabilistic Systems**: Implement Poisson spawning and Normal lifespan distributions.
    5. **Movement Engine**: Implement vectorized movement math with collision detection.
    6. **State Machine**: Implement transitions for Wandering, Digging, and Foraging.
- **Verification**: Use `pytest` to verify Poisson spawning, Normal lifespan, and vectorized movement math without a GUI.
- **Output**: A 10Hz stream of `AntPacket` objects.

#### Workstream B: The Terrarium (TypeScript/PixiJS)
- **Goal**: Implement the 60FPS renderer with a 100ms interpolation buffer.
- **Tasks**:
    1. **Frontend Scaffold**: Initialize Vite + TypeScript + PixiJS environment.
    2. **Static Layers**: Render the Sky, Grass, and Dirt background layers.
    3. **Ant Sprites**: Implement `AntSprite` with 2-frame walk animations and rotation.
    4. **Interpolation Engine**: Build the 100ms buffer to lerp positions between packets.
    5. **Tunnel Rendering**: Implement incremental "dirt clearing" using PixiJS `RenderTexture`.
    6. **Mock Provider**: Create a synthetic data generator for standalone UI testing.
- **Verification**: Use a "Mock Provider" that generates synthetic `AntPacket` data to test sprite rotation, 2-frame animations, and "Dirt" clearing performance.
- **Interpolation**: Ensure smooth movement even if the mock stream jitters.

#### Workstream C: Integration (FastAPI)
- **Goal**: Connect Workstream A to Workstream B via WebSockets.
- **Tasks**:
    1. **API Setup**: Initialize FastAPI with WebSocket support and Pydantic models (ensure `venv` is active).
    2. **Broadcast Loop**: Implement the 10Hz non-blocking broadcast mechanism.
    3. **State Sync**: Implement the "Full World Snapshot" for new client connections.
    4. **Serialization**: Optimize the NumPy-to-JSON (or Binary) conversion.
- **Sync**: Initial "Full World Snapshot" on connection (160x120 grid), followed by the 10Hz delta stream.

## 5. Monorepo Structure
```text
anthill/
├── backend/      # Python Simulation (FastAPI, NumPy)
├── frontend/     # TypeScript/PixiJS Web App
├── docs/         # Specifications & Documentation
└── scripts/      # Single-command startup scripts
```
