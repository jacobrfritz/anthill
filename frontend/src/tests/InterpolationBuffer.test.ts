import { describe, it, expect } from 'vitest';
import { InterpolationBuffer } from '../InterpolationBuffer';
import { AntPacket } from '../types';

describe('InterpolationBuffer', () => {
  it('should return null when less than 2 packets are added', () => {
    const buffer = new InterpolationBuffer(100);
    const packet: AntPacket = { t: 1000, ants: [], deltas: [] };
    buffer.addPacket(packet);

    expect(buffer.getInterpolationState(1050)).toBeNull();
  });

  it('should return correct interpolation state between two packets', () => {
    const buffer = new InterpolationBuffer(100);
    const packetA: AntPacket = { t: 1000, ants: [0, 0, 0, 0, 1], deltas: [] };
    const packetB: AntPacket = { t: 1100, ants: [10, 10, 0, 0, 1], deltas: [] };
    
    buffer.addPacket(packetA);
    buffer.addPacket(packetB);

    const state = buffer.getInterpolationState(1050);
    expect(state).not.toBeNull();
    if (state) {
      expect(state.packetA).toBe(packetA);
      expect(state.packetB).toBe(packetB);
      expect(state.alpha).toBe(0.5);
    }
  });

  it('should find the correct packets in a larger buffer', () => {
    const buffer = new InterpolationBuffer(100);
    const p1 = { t: 1000, ants: [], deltas: [] };
    const p2 = { t: 1100, ants: [], deltas: [] };
    const p3 = { t: 1200, ants: [], deltas: [] };
    const p4 = { t: 1300, ants: [], deltas: [] };

    buffer.addPacket(p1);
    buffer.addPacket(p2);
    buffer.addPacket(p3);
    buffer.addPacket(p4);

    const state = buffer.getInterpolationState(1150);
    expect(state).not.toBeNull();
    if (state) {
      expect(state.packetA).toBe(p2);
      expect(state.packetB).toBe(p3);
      expect(state.alpha).toBe(0.5);
    }
  });
});
