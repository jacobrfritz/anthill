import numpy as np
import pytest
from app.simulation.world import World
from app.simulation.manager import SimulationManager

def test_world_initialization():
    world = World()
    assert world.grid.shape == (160, 120)
    # Top 15% (18 cells) should be air (0)
    assert np.all(world.grid[:, :18] == 0)
    # Rest should be dirt (1)
    assert np.all(world.grid[:, 18:] == 1)

def test_world_coordinate_mapping():
    world = World()
    # (0, 0) -> (0, 0)
    assert world._to_grid_coords(0, 0) == (0, 0)
    # (5, 5) -> (1, 1)
    assert world._to_grid_coords(5, 5) == (1, 1)
    # (799, 599) -> (159, 119)
    assert world._to_grid_coords(799, 599) == (159, 119)

def test_is_dirt_and_clear_dirt():
    world = World()
    # (0, 0) is air
    assert not world.is_dirt(0, 0)
    # (100, 100) is dirt (y=100 -> gy=20)
    assert world.is_dirt(100, 100)
    
    # Clear dirt at (100, 100)
    assert world.clear_dirt(100, 100)
    assert not world.is_dirt(100, 100)
    assert (20, 20) in world.get_deltas()
    # Deltas should be empty after get_deltas()
    assert len(world.get_deltas()) == 0

def test_simulation_spawning():
    manager = SimulationManager()
    # Initially no ants active
    assert np.sum(manager.colony[:, 6]) == 0
    
    # Force spawn timer
    manager.spawn_timer = manager.next_spawn_delay + 0.1
    manager.update(0.1)
    
    active_ants = np.sum(manager.colony[:, 6])
    assert active_ants > 0
    assert manager.total_spawned == active_ants

def test_ant_lifespan():
    manager = SimulationManager()
    manager.LIFESPAN_MEAN = 0.1 # 0.1 seconds
    manager.LIFESPAN_STD = 0.01
    manager.SPAWN_RATE = 100.0 # spawn fast
    
    # Force a spawn
    manager.spawn_timer = manager.next_spawn_delay + 0.1
    manager.update(0.1)
    active_before = np.sum(manager.colony[:, 6])
    assert active_before > 0
    
    # Wait for them to die
    manager.update(1.0)
    active_after = np.sum(manager.colony[:, 6])
    assert active_after < active_before

def test_movement_clipping():
    manager = SimulationManager()
    # Force an ant at the boundary
    manager._spawn_ant()
    manager.colony[0, 0] = 799
    manager.colony[0, 1] = 599
    manager.colony[0, 2] = 0 # Facing right
    manager.colony[0, 6] = 1 # Active
    
    manager.update(0.1)
    assert manager.colony[0, 0] <= 799
    assert manager.colony[0, 1] <= 599

def test_collision_response():
    manager = SimulationManager()
    # Force an ant to collide with dirt
    manager._spawn_ant()
    manager.colony[0, 0] = 100
    manager.colony[0, 1] = 100
    manager.colony[0, 2] = 0 # Facing right
    manager.colony[0, 3] = 0 # Wandering (should collide)
    manager.colony[0, 4] = 10.0 # Positive timer to prevent state change
    manager.colony[0, 6] = 1 # Active
    
    initial_theta = manager.colony[0, 2]
    manager.update(0.01) # Small dt to ensure it's still in dirt
    
    # Theta should have changed (flipped by pi + noise)
    assert abs(manager.colony[0, 2] - (initial_theta + np.pi)) < 0.5

def test_digging_logic():
    manager = SimulationManager()
    # Force an ant to dig
    manager._spawn_ant()
    manager.colony[0, 0] = 100
    manager.colony[0, 1] = 100
    manager.colony[0, 2] = 0 # Facing right
    manager.colony[0, 3] = 1 # Digging
    manager.colony[0, 4] = 10.0 # Positive timer
    manager.colony[0, 6] = 1 # Active
    
    manager.update(0.1)
    
    # It should have moved. Let's get actual grid coords.
    gx = int(manager.colony[0, 0] // 5)
    gy = int(manager.colony[0, 1] // 5)
    
    assert manager.world.grid[gx, gy] == 0
    assert (gx, gy) in manager.get_packet().deltas
