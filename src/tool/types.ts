export type StopMode = 'even' | 'weighted';

export type StopUnit = '%' | 'px';

export interface HistoryEntry {
  /** Short human readable description of the saved gradient. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Distribution mode: evenly spaced or manually weighted stops. */
  mode: StopMode;
  /** Gradient angle in degrees, 0-360. */
  angle: number;
  /** Position unit used in the CSS output. */
  unit: StopUnit;
  /** Hex colors for each stop (2-12 entries). */
  colors: string[];
  /** Stop positions in percent (0-100), same length as colors. */
  positions: number[];
  /** Saved gradient history, newest first. */
  history: HistoryEntry[];
}

export const MIN_STOPS = 2;
export const MAX_STOPS = 12;

/** Reference gradient length used to convert percent positions to px. */
export const PREVIEW_LENGTH_PX = 300;

export const DEFAULT_STATE: ToolState = {
  mode: 'even',
  angle: 90,
  unit: '%',
  colors: ['#ff0000', '#00ff00', '#0000ff'],
  positions: [0, 50, 100],
  history: [],
};

export const MAX_HISTORY = 20;

export const STOP_MODES: { value: StopMode; label: string; hint: string }[] = [
  { value: 'even', label: 'Even', hint: 'evenly spaced stops' },
  { value: 'weighted', label: 'Weighted', hint: 'drag a mid stop, neighbors rebalance' },
];

/** Normalize and clamp an angle into [0, 360]. */
export function normalizeAngle(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const wrapped = ((value % 360) + 360) % 360;
  return Math.round(wrapped * 1000) / 1000;
}

/** Clamp a number into [min, max]; NaN falls back to min. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Normalize a stop count into the supported 2-12 range. */
export function normalizeStopCount(value: number): number {
  return Math.round(clamp(Number.isFinite(value) ? value : MIN_STOPS, MIN_STOPS, MAX_STOPS));
}

/**
 * Parse a hex color. Accepts #rgb / #rrggbb with or without the leading '#'.
 * Returns the canonical '#rrggbb' form, or null for invalid input.
 */
export function parseHexColor(input: string): string | null {
  if (typeof input !== 'string') return null;
  let hex = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toLowerCase()}`;
}

/** True when the string is a valid hex color (3 or 6 digits, optional #). */
export function isValidHex(input: string): boolean {
  return parseHexColor(input) !== null;
}

/** Evenly distribute n stops across 0-100 (endpoints pinned). */
export function evenPositions(count: number): number[] {
  const n = normalizeStopCount(count);
  if (n <= 1) return [0];
  return Array.from({ length: n }, (_, i) => Math.round((i / (n - 1)) * 10000) / 100);
}

/**
 * Build a full even-distribution state for `count` stops, reusing existing
 * colors where available and padding with grayscale defaults.
 */
export function evenlyDistributedColors(colors: string[], count: number): string[] {
  const n = normalizeStopCount(count);
  const fallbackPalette = [
    '#ff0000',
    '#ff8800',
    '#ffee00',
    '#22cc44',
    '#00ffee',
    '#0088ff',
    '#4400ff',
    '#cc00cc',
    '#ff0088',
    '#884422',
    '#222222',
    '#eeeeee',
  ];
  return Array.from({ length: n }, (_, i) => {
    const candidate = colors[i];
    const parsedCandidate = parseHexColor(candidate ?? '');
    return parsedCandidate ?? fallbackPalette[i % fallbackPalette.length] ?? '#000000';
  });
}

/**
 * Weighted rebalance: stop `index` moves to `value` while endpoints stay at
 * 0% / 100% and the interior neighbors are re-spaced linearly between the
 * moved stop and the boundaries.
 */
export function rebalanceWeighted(
  positions: number[],
  index: number,
  value: number
): { positions: number[]; index: number } {
  const n = positions.length;
  if (n < 3 || index <= 0 || index >= n - 1) {
    return { positions: [...positions], index };
  }
  const prev = positions[index - 1] ?? 0;
  const next = positions[index + 1] ?? 100;
  const clamped = clamp(value, prev, next);
  const result = [...positions];
  const moved = Math.round(clamped * 100) / 100;
  result[index] = moved;
  // Left segment: linearly space stops 1..index-1 between 0 and the moved stop.
  for (let i = 1; i < index; i++) {
    result[i] = Math.round(((moved * i) / index) * 100) / 100;
  }
  // Right segment: linearly space stops index+1..n-2 between the moved stop and 100.
  const rightCount = n - 1 - index;
  for (let i = 1; i < rightCount; i++) {
    result[index + i] = Math.round(((100 - moved) * (i / rightCount) + moved) * 100) / 100;
  }
  return { positions: result, index };
}

/** Clamp every position and re-pin endpoints; keeps the arrays consistent. */
export function sanitizePositions(positions: number[]): number[] {
  return positions.map((p, i, arr) => {
    if (i === 0) return 0;
    if (i === arr.length - 1) return 100;
    return Math.round(clamp(p, 0, 100) * 100) / 100;
  });
}

/** Reverse the palette order and recompute positions. */
export function reversePalette(state: ToolState): ToolState {
  return {
    ...state,
    colors: [...state.colors].reverse(),
    positions: [...state.positions].reverse(),
  };
}

/** Rotate the palette by one stop; positions stay, colors cycle. */
export function rotatePalette(state: ToolState): ToolState {
  const first = state.colors[0];
  if (state.colors.length < 2 || first === undefined) return state;
  return {
    ...state,
    colors: [...state.colors.slice(1), first],
  };
}

/** Round a position to at most 2 decimals. */
export function formatPosition(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Convert a percent position to px against the preview length. */
export function percentToPx(percent: number, previewLengthPx = PREVIEW_LENGTH_PX): string {
  return String(Math.round((percent / 100) * previewLengthPx * 100) / 100);
}

export interface CssGradientOptions {
  unit?: StopUnit;
  previewLengthPx?: number;
}

/**
 * Serialize the state into a copy-ready CSS linear-gradient. The output always
 * matches the live preview bar: same colors, same stops, same angle.
 */
export function serializeCssGradient(state: ToolState, options: CssGradientOptions = {}): string {
  const unit = options.unit ?? state.unit;
  const stops = state.colors
    .map((color, i) => {
      const parsed = parseHexColor(color) ?? '#000000';
      const position = state.positions[i] ?? 0;
      const positionText =
        unit === 'px' ? percentToPx(position, options.previewLengthPx) : formatPosition(position);
      return `${parsed} ${positionText}${unit}`;
    })
    .join(', ');
  return `linear-gradient(${normalizeAngle(state.angle)}deg, ${stops})`;
}

/** Build the preview CSS background value (always percent-based). */
export function previewGradientCss(state: ToolState): string {
  return serializeCssGradient(state, { unit: '%' });
}

export interface GradientValidation {
  valid: boolean;
  error: string | null;
}

/** Validate the whole state: colors parse and positions are ordered. */
export function validateState(state: ToolState): GradientValidation {
  if (state.colors.length < MIN_STOPS) {
    return { valid: false, error: `A gradient needs at least ${MIN_STOPS} colors.` };
  }
  if (state.colors.length > MAX_STOPS) {
    return { valid: false, error: `A gradient supports at most ${MAX_STOPS} colors.` };
  }
  for (const color of state.colors) {
    if (!isValidHex(color)) {
      return { valid: false, error: `Invalid hex color: ${color}` };
    }
  }
  for (let i = 1; i < state.positions.length; i++) {
    const cur = state.positions[i] ?? 0;
    const prevPos = state.positions[i - 1] ?? 0;
    if (cur < prevPos) {
      return { valid: false, error: 'Stop positions must be in increasing order.' };
    }
  }
  return { valid: true, error: null };
}

/** Human-readable result for the status bar, or null for invalid state. */
export function resultText(state: ToolState): string | null {
  const validation = validateState(state);
  if (!validation.valid) return null;
  return serializeCssGradient(state);
}

/** One formula-like line per step describing how the stops were computed. */
export function stepsFor(state: ToolState): string[] {
  const validation = validateState(state);
  if (!validation.valid) return [validation.error ?? 'Invalid gradient state.'];
  const lines = [
    `Angle: ${normalizeAngle(state.angle)}deg (wrapped into 0-360)`,
    state.mode === 'even'
      ? `Even mode: stop i sits at i / (n - 1) × 100% for n = ${state.colors.length}`
      : `Weighted mode: endpoints pinned at 0% and 100%, interior stops re-spaced linearly`,
  ];
  state.colors.forEach((color, i) => {
    const parsed = parseHexColor(color) ?? color;
    const position = state.positions[i] ?? 0;
    lines.push(`Stop ${i + 1}: ${parsed} at ${formatPosition(position)}%`);
  });
  return lines;
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const validation = validateState(state);
  return validation.valid
    ? `${state.colors.length} stops · ${normalizeAngle(state.angle)}deg · ${state.unit}`
    : (validation.error ?? 'Invalid gradient');
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.mode === 'string' &&
    Array.isArray(v.colors) &&
    Array.isArray(v.positions) &&
    DEFAULT_STATE !== undefined
  );
}

export { STOP_MODES as MODES };
