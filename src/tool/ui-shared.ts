import { STOP_MODES, DEFAULT_STATE, type StopMode, type ToolState } from './types';

export const MODE_LABELS: { value: StopMode; label: string; hint: string }[] = STOP_MODES;

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.mode === 'string' && Array.isArray(v.colors) && DEFAULT_STATE !== undefined;
}
