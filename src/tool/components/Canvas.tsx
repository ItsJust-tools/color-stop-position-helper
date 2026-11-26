'use client';

import React from 'react';
import {
  MAX_STOPS,
  MIN_STOPS,
  formatPosition,
  normalizeAngle,
  previewGradientCss,
  serializeCssGradient,
  validateState,
  evenPositions,
  evenlyDistributedColors,
  rebalanceWeighted,
  parseHexColor,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const numberInputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const validation = validateState(state);
  const css = validateState(state).valid ? serializeCssGradient(state) : null;
  const previewCss = previewGradientCss(state);

  const handleStopCount = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const count = Math.min(MAX_STOPS, Math.max(MIN_STOPS, Math.round(n)));
    update({
      colors: evenlyDistributedColors(state.colors, count),
      positions: evenPositions(count),
    });
  };

  const handleHex = (index: number, raw: string) => {
    const colors = [...state.colors];
    colors[index] = raw;
    update({ colors });
  };

  const commitHex = (index: number, raw: string) => {
    const parsed = parseHexColor(raw);
    if (parsed) {
      const colors = [...state.colors];
      colors[index] = parsed;
      update({ colors });
    }
  };

  const handleWeightedMove = (index: number, value: number) => {
    if (state.mode !== 'weighted') return;
    const rebalanced = rebalanceWeighted(state.positions, index, value);
    update({ positions: rebalanced.positions });
  };

  const barHeight = 64;

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="gradient-canvas">
      {!validation.valid ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
          role="alert"
          data-testid="invalid-gradient"
        >
          {validation.error}
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Live preview ({state.colors.length} stops · {normalizeAngle(state.angle)}deg)
        </h3>
        <div
          className="relative w-full rounded-md border border-gray-200 dark:border-gray-800"
          style={{ background: previewCss, height: barHeight }}
          data-testid="preview-bar"
        >
          {state.positions.map((position, i) => (
            <span
              key={i}
              data-testid={`tick-${i}`}
              title={`${formatPosition(position)}%`}
              className="absolute top-0 h-full w-px bg-black/30 dark:bg-white/40"
              style={{ left: `${position}%` }}
            />
          ))}
        </div>
        <div className="relative mt-1 h-4" data-testid="tick-labels">
          {state.positions.map((position, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 font-mono text-[10px] text-gray-500 dark:text-gray-400"
              style={{ left: `${position}%` }}
            >
              {formatPosition(position)}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Colors ({MIN_STOPS}-{MAX_STOPS})
            <input
              type="number"
              min={MIN_STOPS}
              max={MAX_STOPS}
              value={state.colors.length}
              onChange={(e) => handleStopCount(e.target.value)}
              data-testid="stop-count"
              className={numberInputClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Angle (0-360deg)
            <input
              type="range"
              min={0}
              max={360}
              value={Math.round(normalizeAngle(state.angle))}
              onChange={(e) => update({ angle: Number(e.target.value) })}
              data-testid="angle-slider"
              className="mt-2 w-full"
            />
          </label>
          <div className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Position unit
            <div className="mt-1 flex gap-1" role="group" aria-label="Position unit">
              {(['%', 'px'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  role="tab"
                  aria-selected={state.unit === unit}
                  data-testid={`unit-${unit === '%' ? 'percent' : 'px'}`}
                  onClick={() => update({ unit })}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    state.unit === unit
                      ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
                  }`}
                >
                  {unit === '%' ? 'Percent (%)' : 'Pixels (px)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2" data-testid="stop-rows">
          {state.colors.map((color, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2"
              data-testid={`stop-row-${i}`}
            >
              <input
                type="color"
                value={parseHexColor(color) ?? '#000000'}
                onChange={(e) => handleHex(i, e.target.value)}
                data-testid={`stop-color-${i}`}
                className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800"
                aria-label={`Stop ${i + 1} color picker`}
              />
              <label className="flex-1 min-w-[8rem] block text-xs font-medium text-gray-700 dark:text-gray-300">
                Hex
                <input
                  type="text"
                  value={color}
                  onChange={(e) => handleHex(i, e.target.value)}
                  onBlur={(e) => commitHex(i, e.target.value)}
                  data-testid={`stop-hex-${i}`}
                  placeholder="#3b82f6"
                  className={numberInputClass}
                  aria-invalid={!parseHexColor(color)}
                />
              </label>
              <label className="flex-1 min-w-[8rem] block text-xs font-medium text-gray-700 dark:text-gray-300">
                Position
                {state.mode === 'weighted' && i > 0 && i < state.positions.length - 1 ? (
                  <input
                    type="range"
                    min={state.positions[i - 1]}
                    max={state.positions[i + 1]}
                    step={0.5}
                    value={state.positions[i]}
                    onChange={(e) => handleWeightedMove(i, Number(e.target.value))}
                    data-testid={`stop-slider-${i}`}
                    className="mt-2 w-full"
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={state.positions[i]}
                    disabled
                    data-testid={`stop-position-${i}`}
                    className={numberInputClass}
                  />
                )}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            CSS output
          </h3>
          {css ? <CopyButton value={css} testid="copy-css" /> : null}
        </div>
        <pre
          data-testid="css-output"
          className="max-h-40 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] leading-4 text-gray-100"
        >
          <code>{css ?? '—'}</code>
        </pre>
        {css ? (
          <p
            className="mt-2 text-xs text-gray-500 dark:text-gray-400"
            data-testid="css-preview-match"
          >
            The snippet uses the same angle and stops as the preview bar above.
          </p>
        ) : null}
        {css ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(css)}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved gradients yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All gradient math runs locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
