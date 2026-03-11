# Anthill Simulation

A high-performance "Distributed Simulation" where a Python/NumPy backend handles mathematical modeling and a browser-based PixiJS engine handles visual rendering.

## 🚀 Quick Start

To start both the backend and frontend simultaneously, run the provided startup script from the project root:

```bash
./scripts/start.sh
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

## 🏗️ Architecture

### Backend: The "Brain" (Python + NumPy)
The backend acts as the mathematical engine, managing a colony of 500 ants using vectorized NumPy operations for high performance.
- **Colony Matrix**: A `500x7` matrix representing `[x, y, theta, state, timer, age, active]`.
- **World Grid**: A `160x120` grid representing dirt and tunnels (5:1 scale to the 800x600 canvas).
- **Probabilistic Modeling**: Ants arrive via a **Poisson Process**, have a **Normal** lifespan distribution, and transition between states (Wandering, Digging, Foraging).
- **Network**: Broadcasts 10Hz `AntPacket` updates via FastAPI WebSockets.

### Frontend: The "Terrarium" (TypeScript + PixiJS)
The frontend provides a smooth 60FPS visual experience using GPU-accelerated rendering.
- **Interpolation Engine**: Implements a 100ms buffer to linearly interpolate (Lerp) ant positions between 10Hz network packets, ensuring fluid movement even with network jitter.
- **Dynamic Tunnels**: Real-time dirt clearing using PixiJS `RenderTexture` based on deltas received from the backend.
- **Visuals**: Animated 2-frame walk cycles and rotation-aware ant sprites.

## 🛠️ Manual Setup

### Backend
1. Navigate to `backend/`
2. Create virtual environment: `python -m venv .venv`
3. Activate venv: `source .venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run tests: `pytest`

### Frontend
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

## 📜 Technical Specifications

- **Canvas Size**: 800px x 600px.
- **Grid Scale**: 5px per grid cell (160x120 total cells).
- **Broadcast Frequency**: 10Hz (10 packets per second).
- **Visual FPS**: 60FPS (via interpolation).
- **Ant Capacity**: Fixed 500 slots.

## 🛠️ Development Tools

- **Linter/Formatter**: `ruff` (Backend), `eslint`/`prettier` (Frontend).
- **Type Checking**: `mypy` (Backend), `tsc` (Frontend).
- **Testing**: `pytest` (Backend), `vitest` (Frontend).
