from pydantic import BaseModel
from typing import List, Tuple

class AntPacket(BaseModel):
    t: int                # Server timestamp (ms)
    ants: List[float]     # Flattened: [x1, y1, theta1, state1, active1, x2, y2...]
    deltas: List[Tuple[int, int]] # List of [gx, gy] coordinates to clear
