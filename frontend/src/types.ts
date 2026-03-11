export interface AntPacket {
  t: number;
  ants: number[]; // [x1, y1, theta1, state1, active1, x2, y2, theta2, state2, active2, ...]
  deltas: [number, number][]; // [gx, gy][]
}

export enum AntState {
  Wandering = 0,
  Digging = 1,
  Foraging = 2,
}

export interface AntData {
  id: number;
  x: number;
  y: number;
  theta: number;
  state: AntState;
  active: boolean;
}
