import { describe, it, expect } from 'vitest';
import {
  parseHexColor,
  isValidHex,
  evenPositions,
  evenlyDistributedColors,
  normalizeStopCount,
  normalizeAngle,
  clamp,
  rebalanceWeighted,
  sanitizePositions,
  reversePalette,
  rotatePalette,
  serializeCssGradient,
  previewGradientCss,
  percentToPx,
  formatPosition,
  validateState,
  resultText,
  stepsFor,
  summaryText,
  historyText,
  DEFAULT_STATE,
  MAX_STOPS,
  MIN_STOPS,
  PREVIEW_LENGTH_PX,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  withHistory,
  roundTrips,
  moveStop,
  colorStopPositionHelperTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('hex color parsing', () => {
  it('parses 6-digit hex with and without hash and preserves case-normalized output', () => {
    expect(parseHexColor('#ff8800')).toBe('#ff8800');
    expect(parseHexColor('FF8800')).toBe('#ff8800');
    expect(parseHexColor('#FFFFFF')).toBe('#ffffff');
    expect(parseHexColor('#000000')).toBe('#000000');
  });

  it('expands 3-digit hex', () => {
    expect(parseHexColor('#abc')).toBe('#aabbcc');
    expect(parseHexColor('F0A')).toBe('#ff00aa');
  });

  it('rejects invalid hex input', () => {
    expect(parseHexColor('')).toBeNull();
    expect(parseHexColor('#')).toBeNull();
    expect(parseHexColor('#12345')).toBeNull();
    expect(parseHexColor('#1234567')).toBeNull();
    expect(parseHexColor('zzzzzz')).toBeNull();
    expect(parseHexColor('#12 456')).toBeNull();
    expect(parseHexColor('rgb(0,0,0)')).toBeNull();
    expect(parseHexColor(null as unknown as string)).toBeNull();
  });

  it('isValidHex mirrors parseHexColor', () => {
    expect(isValidHex('#ff0000')).toBe(true);
    expect(isValidHex('f00')).toBe(true);
    expect(isValidHex('nope')).toBe(false);
    expect(isValidHex('#12345')).toBe(false);
  });
});

describe('even distribution for 2-12 colors', () => {
  it('pins endpoints and spaces evenly for every supported count', () => {
    for (let n = 2; n <= 12; n++) {
      const positions = evenPositions(n);
      expect(positions).toHaveLength(n);
      expect(positions[0]).toBe(0);
      expect(positions[n - 1]).toBe(100);
      for (let i = 1; i < n; i++) {
        expect(positions[i]).toBeCloseTo((i / (n - 1)) * 100, 1);
      }
    }
  });

  it('produces the canonical 2, 3 and 4 stop layouts', () => {
    expect(evenPositions(2)).toEqual([0, 100]);
    expect(evenPositions(3)).toEqual([0, 50, 100]);
    expect(evenPositions(4)).toEqual([0, 33.33, 66.67, 100]);
  });

  it('clamps the stop count into 2-12', () => {
    expect(normalizeStopCount(1)).toBe(2);
    expect(normalizeStopCount(999)).toBe(12);
    expect(normalizeStopCount(7)).toBe(7);
    expect(normalizeStopCount(NaN)).toBe(MIN_STOPS);
    expect(MAX_STOPS).toBe(12);
  });

  it('evenlyDistributedColors reuses valid colors and pads invalid ones', () => {
    const colors = evenlyDistributedColors(['#ff0000', 'bad', '', '#00ff00'], 4);
    expect(colors[0]).toBe('#ff0000');
    expect(colors[1]).not.toBe('bad');
    expect(colors[3]).toBe('#00ff00');
    expect(colors).toHaveLength(4);
    for (const color of colors) expect(isValidHex(color)).toBe(true);
  });
});

describe('weighted mid-stop rebalancing', () => {
  it('keeps endpoints at 0% and 100% after moving a mid stop', () => {
    const base = [0, 33.33, 66.67, 100];
    const { positions } = rebalanceWeighted(base, 1, 20);
    expect(positions[0]).toBe(0);
    expect(positions[positions.length - 1]).toBe(100);
    expect(positions[1]).toBe(20);
  });

  it('interpolates left neighbors linearly between 0 and the moved stop', () => {
    const base = [0, 25, 50, 75, 100];
    const { positions } = rebalanceWeighted(base, 3, 60);
    expect(positions[0]).toBe(0);
    expect(positions[4]).toBe(100);
    expect(positions[3]).toBe(60);
    // stops 1 and 2 re-space between 0 and 60
    expect(positions[1]).toBeCloseTo(20, 5);
    expect(positions[2]).toBeCloseTo(40, 5);
  });

  it('interpolates right neighbors between the moved stop and 100', () => {
    const base = [0, 25, 50, 75, 100];
    const { positions, index } = rebalanceWeighted(base, 1, 40);
    expect(index).toBe(1);
    expect(positions[1]).toBe(40);
    // stops 2 and 3 re-space between 40 and 100
    expect(positions[2]).toBeCloseTo(60, 5);
    expect(positions[3]).toBeCloseTo(80, 5);
  });

  it('clamps a moved stop between its neighbors', () => {
    const base = [0, 50, 100];
    const { positions } = rebalanceWeighted(base, 1, 500);
    expect(positions[1]).toBe(100);
    const below = rebalanceWeighted(base, 1, -50);
    expect(below.positions[1]).toBe(0);
  });

  it('ignores endpoint moves and short arrays', () => {
    const base = [0, 50, 100];
    expect(rebalanceWeighted(base, 0, 42).positions).toEqual(base);
    expect(rebalanceWeighted(base, 2, 42).positions).toEqual(base);
    expect(rebalanceWeighted([0, 100], 1, 42).positions).toEqual([0, 100]);
  });

  it('moveStop only acts in weighted mode', () => {
    const s = state({ mode: 'even', positions: [0, 50, 100] });
    expect(moveStop(s, 1, 80).positions).toEqual([0, 50, 100]);
    const weighted = state({ mode: 'weighted', positions: [0, 50, 100] });
    expect(moveStop(weighted, 1, 80).positions).toEqual([0, 80, 100]);
    expect(moveStop(weighted, 0, 80).positions).toEqual([0, 50, 100]);
  });
});

describe('CSS serialization', () => {
  it('serializes the default 3-stop gradient with deg angle and % stops', () => {
    expect(serializeCssGradient(DEFAULT_STATE)).toBe(
      'linear-gradient(90deg, #ff0000 0%, #00ff00 50%, #0000ff 100%)'
    );
  });

  it('wraps angles into 0-360', () => {
    const s = state({ angle: 450 });
    expect(serializeCssGradient(s)).toContain('90deg');
    const negative = state({ angle: -90 });
    expect(serializeCssGradient(negative)).toContain('270deg');
  });

  it('supports px unit positions against the preview length', () => {
    const s = state({ unit: 'px' });
    const css = serializeCssGradient(s);
    expect(css).toContain('#ff0000 0px');
    expect(css).toContain('#00ff00 150px');
    expect(css).toContain('#0000ff 300px');
  });

  it('honors an explicit unit override without mutating state', () => {
    const s = state({ unit: '%' });
    expect(serializeCssGradient(s, { unit: 'px', previewLengthPx: 400 })).toContain('200px');
    expect(serializeCssGradient(s)).toContain('50%');
  });

  it('percentToPx rounds against the preview length', () => {
    expect(percentToPx(50)).toBe('150');
    expect(percentToPx(50, 400)).toBe('200');
    expect(percentToPx(33.333, 300)).toBe('100');
    expect(PREVIEW_LENGTH_PX).toBe(300);
  });

  it('formats positions without float noise', () => {
    expect(formatPosition(33.333333)).toBe('33.33');
    expect(formatPosition(50)).toBe('50');
    expect(formatPosition(0)).toBe('0');
  });

  it('preview uses percent units regardless of the output unit', () => {
    const s = state({ unit: 'px' });
    expect(previewGradientCss(s)).toContain('50%');
    expect(previewGradientCss(s)).not.toContain('px');
  });

  it('falls back to #000000 for unparseable colors during serialization', () => {
    const s = state({ colors: ['nope', '#00ff00'] });
    expect(serializeCssGradient(s)).toContain('#000000');
  });

  it('CSS output matches the preview colors and angle', () => {
    const css = serializeCssGradient(DEFAULT_STATE);
    const preview = previewGradientCss(DEFAULT_STATE);
    expect(css.replace(' 0%', ' 0%')).toBe(css);
    expect(preview).toBe(css);
  });
});

describe('validation and result text', () => {
  it('accepts a valid state', () => {
    expect(validateState(DEFAULT_STATE).valid).toBe(true);
    expect(resultText(DEFAULT_STATE)).toContain('linear-gradient');
  });

  it('rejects too few or too many colors', () => {
    expect(validateState(state({ colors: ['#ff0000'] })).valid).toBe(false);
    expect(
      validateState(state({ colors: Array.from({ length: 13 }, () => '#000000') })).valid
    ).toBe(false);
  });

  it('rejects invalid hex colors anywhere in the list', () => {
    const s = state({ colors: ['#ff0000', 'rgb(0,0,0)'] });
    const v = validateState(s);
    expect(v.valid).toBe(false);
    expect(v.error).toContain('Invalid hex');
  });

  it('rejects decreasing positions', () => {
    const s = state({ positions: [0, 70, 50] });
    const v = validateState(s);
    expect(v.valid).toBe(false);
    expect(v.error).toContain('increasing');
  });

  it('resultText is null for invalid state and steps explain the math', () => {
    expect(resultText(state({ colors: ['#zzzzzz', '#00ff00'] }))).toBeNull();
    const steps = stepsFor(DEFAULT_STATE);
    expect(steps[0]).toContain('90deg');
    expect(steps.some((line) => line.includes('Stop 2: #00ff00 at 50%'))).toBe(true);
  });

  it('summary, history and steps handle invalid state', () => {
    const bad = state({ colors: ['#ff0000'] });
    expect(summaryText(bad)).toContain('at least');
    expect(stepsFor(bad)[0]).toContain('at least');
    expect(historyText(DEFAULT_STATE)).toBe(summaryText(DEFAULT_STATE));
  });
});

describe('reverse and rotate palette', () => {
  it('reverse flips colors and positions together', () => {
    const s = state({ colors: ['#ff0000', '#00ff00', '#0000ff'], positions: [0, 25, 100] });
    const reversed = reversePalette(s);
    expect(reversed.colors).toEqual(['#0000ff', '#00ff00', '#ff0000']);
    expect(reversed.positions).toEqual([100, 25, 0]);
  });

  it('rotate cycles colors with recomputed even positions', () => {
    const s = state({ colors: ['#ff0000', '#00ff00', '#0000ff'] });
    const rotated = rotatePalette(s);
    expect(rotated.colors).toEqual(['#00ff00', '#0000ff', '#ff0000']);
    expect(rotated.positions).toEqual(s.positions);
  });

  it('rotate keeps single-color palettes unchanged', () => {
    const s = state({ colors: ['#ff0000', '#ff0000'] });
    expect(rotatePalette(s)).toEqual(s);
  });
});

describe('angle and clamp helpers', () => {
  it('normalizeAngle wraps any number into 0-360', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(NaN)).toBe(0);
  });

  it('clamp bounds values and falls back on NaN', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(NaN, 0, 10)).toBe(0);
  });
});

describe('serialize/deserialize round-trip', () => {
  it('serializes all state fields', () => {
    const s = state({ history: [{ text: 'g', createdAt: '2026-01-01T00:00:00.000Z' }] });
    const parsed = JSON.parse(serializeState(s));
    expect(parsed.mode).toBe('even');
    expect(parsed.angle).toBe(90);
    expect(parsed.unit).toBe('%');
    expect(parsed.colors).toEqual(DEFAULT_STATE.colors);
    expect(parsed.positions).toEqual([0, 50, 100]);
    expect(parsed.history).toHaveLength(1);
  });

  it('restores a saved state exactly', () => {
    const s = state({ mode: 'weighted', angle: 270, unit: 'px' });
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(s);
    }
  });

  it('roundTrips for weighted and px configurations', () => {
    expect(roundTrips(state({ mode: 'weighted' }))).toBe(true);
    expect(roundTrips(state({ unit: 'px', angle: 33.5 }))).toBe(true);
    expect(roundTrips(DEFAULT_STATE)).toBe(true);
  });

  it('repairs broken payloads with defaults', () => {
    const restored = deserializeState({ nope: true });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.mode).toBe(DEFAULT_STATE.mode);
      expect(restored.data.colors).toEqual(DEFAULT_STATE.colors);
    }
  });

  it('rejects wrong payload shapes', () => {
    expect(deserializeState('not an object').success).toBe(false);
    expect(deserializeState([1, 2, 3]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
  });

  it('repairs too-few colors back to the default palette', () => {
    const restored = deserializeState({ colors: ['#ff0000'] });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.colors).toEqual(DEFAULT_STATE.colors);
    }
  });

  it('truncates oversized color lists and repairs non-hex entries', () => {
    const restored = deserializeState({
      colors: Array.from({ length: 20 }, (_, i) => (i % 2 ? 'bad' : '#112233')),
    });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.colors).toHaveLength(12);
      for (const c of restored.data.colors) expect(isValidHex(c)).toBe(true);
    }
  });

  it('mismatched position counts are re-derived evenly', () => {
    const restored = deserializeState({ colors: ['#ff0000', '#00ff00'], positions: [1, 2, 3] });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.positions).toEqual([0, 100]);
    }
  });

  it('clamps out-of-range and decreasing positions', () => {
    const restored = deserializeState({
      colors: ['#ff0000', '#00ff00', '#0000ff'],
      positions: [-10, 250, 100],
    });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.positions[0]).toBe(0);
      expect(restored.data.positions[1]).toBe(100);
    }
  });

  it('wrangles invalid angles and units into defaults', () => {
    const restored = deserializeState({ angle: 720, unit: 'em' });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.angle).toBe(0);
      expect(restored.data.unit).toBe('%');
    }
  });

  it('drops malformed history entries and caps at MAX_HISTORY', () => {
    const restored = deserializeState({
      history: [
        { text: 'ok', createdAt: '2026-01-01T00:00:00.000Z' },
        'junk',
        { text: 42, createdAt: '2026-01-02T00:00:00.000Z' },
      ],
    });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.history).toHaveLength(1);
    }
  });

  it('withHistory prepends and caps entries', () => {
    let s = state();
    for (let i = 0; i < 25; i++) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(20);
    expect(s.history[0]?.text).toBe('entry 24');
    expect(s.history[19]?.text).toBe('entry 5');
  });
});

describe('tool definition', () => {
  it('exposes the canonical tool identity', () => {
    expect(colorStopPositionHelperTool.id).toBe('color-stop-position-helper');
    expect(colorStopPositionHelperTool.name).toBe('Color Stop Position Helper');
    expect(colorStopPositionHelperTool.initialState).toEqual(DEFAULT_STATE);
    expect(colorStopPositionHelperTool.serialize).toBe(serializeState);
    expect(colorStopPositionHelperTool.deserialize).toBe(deserializeState);
  });

  it('declares image exporters', async () => {
    const exporters = colorStopPositionHelperTool.exporters ?? [];
    expect(exporters.map((e) => e.format)).toEqual(['png', 'jpeg', 'webp', 'pdf']);
    const png = await (
      exporters[0] as { loader: () => Promise<{ default: { format: string } }> }
    ).loader();
    const resolved =
      'default' in png
        ? png.default
        : (png as unknown as { exporter: { format: string } }).exporter;
    expect(resolved.format).toBe('png');
  });
});

describe('sanitizePositions', () => {
  it('pins endpoints and clamps interior stops', () => {
    expect(sanitizePositions([-5, 40, 150])).toEqual([0, 40, 100]);
    expect(sanitizePositions([10, 50, 90])).toEqual([0, 50, 100]);
  });
});
