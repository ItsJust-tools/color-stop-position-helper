'use client';

import React from 'react';
import { MODE_LABELS } from '../ui-shared';
import { STOP_MODES, summaryText, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="gradient-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Distribution modes</h3>
        <div className="flex gap-1" role="group" aria-label="Mode switch">
          {STOP_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={state.mode === mode.value}
              data-testid={`sidebar-mode-${mode.value}`}
              onClick={() => onChange({ ...state, mode: mode.value })}
              className={`rounded-md border px-2 py-1 text-xs ${
                state.mode === mode.value
                  ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                  : 'border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {MODE_LABELS.map((mode) => (
            <li key={mode.value} className="flex justify-between gap-2">
              <span>{mode.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{mode.hint}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">How it works</h3>
        <ul className="list-inside list-disc space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Even mode spaces all stops equally between 0% and 100%.</li>
          <li>
            Weighted mode lets you drag any interior stop; endpoints stay pinned and neighbors
            re-space linearly.
          </li>
          <li>Reverse flips the palette order; Rotate cycles the colors one position.</li>
          <li>Angle wraps into the 0-360 degree range in the CSS output.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Current gradient</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-summary">
          {summaryText(state)}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved gradients</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>C</kbd> — Copy the CSS gradient
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current gradient; open it to
          restore these settings.
        </p>
      </div>
    </div>
  );
};
