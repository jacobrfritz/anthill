import numpy as np
import time
from typing import List, Tuple
from .world import World
from .models import AntPacket

class SimulationManager:
    N_ANTS = 500
    SPAWN_RATE = 2.0  # ants/sec (lambda for Poisson process)
    LIFESPAN_MEAN = 1000.0  # seconds
    LIFESPAN_STD = 50.0  # seconds
    SPEED = 50.0 # pixels/sec
    GRASS_LINE_Y = 80.0
    SPAWN_X_POINTS = [160.0, 400.0, 640.0]

    def __init__(self):
        self.world = World()
        # Colony Matrix S: [x, y, theta, state, timer, age, active]
        self.colony = np.zeros((self.N_ANTS, 7))
        self.lifespans = np.zeros(self.N_ANTS)
        self.next_spawn_delay = np.random.exponential(1.0 / self.SPAWN_RATE)
        self.spawn_timer = 0.0
        self.total_spawned = 0
        self.current_time = 0.0

    def update(self, dt: float):
        self.current_time += dt
        
        # 1. Handle Spawning
        self.spawn_timer += dt
        while self.spawn_timer >= self.next_spawn_delay and self.total_spawned < self.N_ANTS:
            self._spawn_ant()
            self.spawn_timer -= self.next_spawn_delay
            self.next_spawn_delay = np.random.exponential(1.0 / self.SPAWN_RATE)

        mask = self.colony[:, 6] == 1
        if not np.any(mask):
            return

        # 2. Aging & Lifespan check
        self.colony[mask, 5] += dt  # age
        self.colony[mask, 4] -= dt  # state timer
        
        # Deactivate dead ants
        dead_mask = mask & (self.colony[:, 5] >= self.lifespans)
        self.colony[dead_mask, 6] = 0

        # Refresh mask after deactivation
        mask = self.colony[:, 6] == 1
        if not np.any(mask):
            return

        # 3. State Transitions (Simple for now)
        # When timer hits zero, pick new state and duration
        timer_out = mask & (self.colony[:, 4] <= 0)
        if np.any(timer_out):
            # 0: Wandering, 1: Digging, 2: Foraging
            self.colony[timer_out, 3] = np.random.choice([0, 1, 2], size=np.sum(timer_out))
            # Digging ~ Uniform(5, 15), Others ~ Uniform(2, 5)
            digging_mask = timer_out & (self.colony[:, 3] == 1)
            other_mask = timer_out & (self.colony[:, 3] != 1)
            self.colony[digging_mask, 4] = np.random.uniform(5, 15, size=np.sum(digging_mask))
            self.colony[other_mask, 4] = np.random.uniform(2, 5, size=np.sum(other_mask))

        # 4. Movement & Steering
        # Apply some angular noise for organic movement
        # theta is index 2
        angular_velocity = np.random.normal(0, 0.2, size=np.sum(mask))
        self.colony[mask, 2] += angular_velocity * dt

        # Digging ants (state 1) maintain heading with less noise
        dig_mask = mask & (self.colony[:, 3] == 1)
        # Re-apply smaller noise or just leave it for now as per spec "minimal noise"
        # Already applied noise to all, maybe reduce for digging?
        # self.colony[dig_mask, 2] -= angular_velocity[dig_mask[mask]] * 0.8 * dt

        # Position Update
        self.colony[mask, 0] += np.cos(self.colony[mask, 2]) * self.SPEED * dt
        self.colony[mask, 1] += np.sin(self.colony[mask, 2]) * self.SPEED * dt

        # Boundary Handling
        self.colony[mask, 0] = np.clip(self.colony[mask, 0], 0, 799)
        self.colony[mask, 1] = np.clip(self.colony[mask, 1], 0, 599)

        # 5. Collision Detection & Response
        gxs = (self.colony[mask, 0] // self.world.GRID_SCALE).astype(int)
        gys = (self.colony[mask, 1] // self.world.GRID_SCALE).astype(int)
        
        # Ensure within grid bounds for indexing
        gxs = np.clip(gxs, 0, self.world.GRID_WIDTH - 1)
        gys = np.clip(gys, 0, self.world.GRID_HEIGHT - 1)
        
        is_dirt = self.world.grid[gxs, gys] == 1
        
        # State 1 (Digging) clears dirt, others collide
        digging_and_colliding = mask & (self.colony[:, 3] == 1)
        # We need to map back to full colony indices
        active_indices = np.where(mask)[0]
        
        # Ants digging in dirt
        dig_indices = active_indices[is_dirt & (self.colony[mask, 3] == 1)]
        for idx in dig_indices:
            self.world.clear_dirt(self.colony[idx, 0], self.colony[idx, 1])
        
        # Non-digging ants colliding with dirt
        colliding = is_dirt & (self.colony[mask, 3] != 1)
        colliding_indices = active_indices[colliding]
        
        if len(colliding_indices) > 0:
            # Response: Flip theta by pi, move back a bit
            self.colony[colliding_indices, 2] += np.pi
            self.colony[colliding_indices, 0] += np.cos(self.colony[colliding_indices, 2]) * 2.0
            self.colony[colliding_indices, 1] += np.sin(self.colony[colliding_indices, 2]) * 2.0

    def _spawn_ant(self):
        # Find first row where active == 0 and age == 0
        potential_slots = np.where((self.colony[:, 6] == 0) & (self.colony[:, 5] == 0))[0]
        if len(potential_slots) > 0:
            idx = potential_slots[0]
            spawn_x = np.random.choice(self.SPAWN_X_POINTS)
            spawn_y = self.GRASS_LINE_Y
            spawn_theta = np.random.uniform(0, 2 * np.pi)
            
            self.colony[idx] = [spawn_x, spawn_y, spawn_theta, 0, 0, 0, 1]
            self.lifespans[idx] = np.random.normal(self.LIFESPAN_MEAN, self.LIFESPAN_STD)
            self.total_spawned += 1

    def get_packet(self) -> AntPacket:
        # Flattened ants: [x1, y1, theta1, state1, active1, x2, y2...]
        # Spec says: [x1, y1, theta1, state1, active1, x2, y2, theta2, state2, active2...]
        # My colony has [x, y, theta, state, timer, age, active]
        # We need [x, y, theta, state, active] for each ant
        selected_cols = [0, 1, 2, 3, 6]
        ants_data = self.colony[:, selected_cols].flatten().tolist()
        
        return AntPacket(
            t=int(time.time() * 1000),
            ants=ants_data,
            deltas=self.world.get_deltas()
        )
