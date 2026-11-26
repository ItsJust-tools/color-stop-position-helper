import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_STOPS,
  MIN_STOPS,
  normalizeAngle,
  parseHexColor,
  rebalanceWeighted,
  sanitizePositions,
  serializeCssGradient,
  validateState,
  type HistoryEntry,
  type StopMode,
  type StopUnit,
  type ToolState,
} from './types';

const VALID_MODES: StopMode[] = ['even', 'weighted'];
const VALID_UNITS: StopUnit[] = ['%', 'px'];

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    mode: state.mode,
    angle: state.angle,
    unit: state.unit,
    colors: state.colors,
    positions: state.positions,
    history: state.history,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected color stop position helper state object',
    };
  }
  const v = data as Record<string, unknown>;
  const mode: StopMode = VALID_MODES.includes(v.mode as StopMode)
    ? (v.mode as StopMode)
    : DEFAULT_STATE.mode;
  const unit: StopUnit = VALID_UNITS.includes(v.unit as StopUnit)
    ? (v.unit as StopUnit)
    : DEFAULT_STATE.unit;

  let colors: string[];
  if (Array.isArray(v.colors)) {
    colors = v.colors.map((c) => parseHexColor(typeof c === 'string' ? c : '') ?? '#000000');
  } else {
    colors = [...DEFAULT_STATE.colors];
  }
  if (colors.length < MIN_STOPS) colors = [...DEFAULT_STATE.colors];
  if (colors.length > MAX_STOPS) colors = colors.slice(0, MAX_STOPS);

  let positions: number[];
  if (Array.isArray(v.positions) && v.positions.length === colors.length) {
    positions = sanitizePositions(v.positions.map((p) => Number(p)));
  } else {
    positions = sanitizePositions(colors.map((_, i) => (i / Math.max(colors.length - 1, 1)) * 100));
  }

  const state: ToolState = {
    mode,
    angle: normalizeAngle(typeof v.angle === 'number' ? v.angle : DEFAULT_STATE.angle),
    unit,
    colors,
    positions,
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Move one interior stop and rebalance its neighbors (weighted mode). */
export function moveStop(state: ToolState, index: number, value: number): ToolState {
  if (state.mode !== 'weighted' || index <= 0 || index >= state.positions.length - 1) {
    return state;
  }
  const rebalanced = rebalanceWeighted(state.positions, index, value);
  return { ...state, positions: rebalanced.positions };
}

import { resultText as _resultText, stepsFor as _stepsFor } from './types';
export { validateState, serializeCssGradient, rebalanceWeighted };
export const resultText = _resultText;
export const stepsFor = _stepsFor;

export const colorStopPositionHelperTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
