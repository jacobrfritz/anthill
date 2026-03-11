import numpy as np
from typing import List, Tuple

class World:
    GRID_WIDTH = 160
    GRID_HEIGHT = 120
    GRID_SCALE = 5
    
    def __init__(self):
        # Initialize grid with Dirt (1)
        self.grid = np.ones((self.GRID_WIDTH, self.GRID_HEIGHT), dtype=np.int8)
        
        # Top 15% is Air (0)
        air_height = int(self.GRID_HEIGHT * 0.15)
        self.grid[:, :air_height] = 0
        
        # Track changes to the grid
        self.deltas: List[Tuple[int, int]] = []

    def is_dirt(self, x: float, y: float) -> bool:
        """Checks if pixel coordinates (x, y) map to a dirt cell."""
        gx, gy = self._to_grid_coords(x, y)
        if 0 <= gx < self.GRID_WIDTH and 0 <= gy < self.GRID_HEIGHT:
            return self.grid[gx, gy] == 1
        return False

    def clear_dirt(self, x: float, y: float) -> bool:
        """Marks a cell as tunnel (0) and tracks it in deltas. Returns True if dirt was cleared."""
        gx, gy = self._to_grid_coords(x, y)
        if 0 <= gx < self.GRID_WIDTH and 0 <= gy < self.GRID_HEIGHT:
            if self.grid[gx, gy] == 1:
                self.grid[gx, gy] = 0
                self.deltas.append((gx, gy))
                return True
        return False

    def get_deltas(self) -> List[Tuple[int, int]]:
        """Returns the current deltas and clears the internal list."""
        current_deltas = self.deltas.copy()
        self.deltas.clear()
        return current_deltas

    def _to_grid_coords(self, x: float, y: float) -> Tuple[int, int]:
        """Converts pixel coordinates to grid coordinates."""
        return int(x // self.GRID_SCALE), int(y // self.GRID_SCALE)
