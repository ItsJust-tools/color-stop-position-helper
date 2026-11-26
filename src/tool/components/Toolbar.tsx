'use client';

import React from 'react';
import { STOP_MODES, type StopMode, type ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  const setMode = (mode: StopMode) => onChange({ ...state, mode });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Gradient controls"
      >
        <div className="flex gap-1" role="group" aria-label="Distribution mode">
          {STOP_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={state.mode === mode.value}
              data-testid={`mode-${mode.value}`}
              title={mode.hint}
              onClick={() => setMode(mode.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                state.mode === mode.value
                  ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          Angle
          <input
            type="number"
            min={0}
            max={360}
            value={state.angle}
            onChange={(e) => onChange({ ...state, angle: Number(e.target.value) })}
            data-testid="angle-input"
            className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...state,
              colors: [...state.colors].reverse(),
              positions: [...state.positions].reverse(),
            })
          }
          data-testid="btn-reverse"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reverse
        </button>
        <button
          type="button"
          onClick={() => {
            const first = state.colors[0];
            if (first === undefined) return;
            onChange({ ...state, colors: [...state.colors.slice(1), first] });
          }}
          data-testid="btn-rotate"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Rotate
        </button>
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            Copy CSS
          </button>
        ) : null}
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="btn-clear-history"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear history
          </button>
        ) : null}
      </div>
    </div>
  );
};
