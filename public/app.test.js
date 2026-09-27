import { gameToCanvas, intensityToColor } from './canvasMath.js';
import { describe, it, expect } from 'vitest';

describe('gameToCanvas', () => {
  it('maps min bounds to canvas origin', () => {
    const { canvasX, canvasY } = gameToCanvas(-120, -120);
    expect(canvasX).toBeCloseTo(0);
    expect(canvasY).toBeCloseTo(512);
  });

  it('maps max bounds to opposite corner', () => {
    const { canvasX, canvasY } = gameToCanvas(14870, 14980);
    expect(canvasX).toBeCloseTo(512);
    expect(canvasY).toBeCloseTo(0);
  });
});

describe('intensityToColor', () => {
  it('returns blue at 0', () => {
    expect(intensityToColor(0)).toEqual([0, 0, 255]);
  });

  it('returns red at 255', () => {
    expect(intensityToColor(255)).toEqual([255, 0, 0]);
  });
});