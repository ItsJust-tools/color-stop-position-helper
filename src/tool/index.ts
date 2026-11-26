export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  colorStopPositionHelperTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  moveStop,
  resultText,
  stepsFor,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { MODE_LABELS, isState } from './ui-shared';
export {
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_STOPS,
  MIN_STOPS,
  PREVIEW_LENGTH_PX,
  STOP_MODES,
  normalizeAngle,
  clamp,
  normalizeStopCount,
  parseHexColor,
  isValidHex,
  evenPositions,
  evenlyDistributedColors,
  rebalanceWeighted,
  sanitizePositions,
  reversePalette,
  rotatePalette,
  formatPosition,
  percentToPx,
  serializeCssGradient,
  previewGradientCss,
  validateState,
  resultText as gradientResultText,
  stepsFor as gradientStepsFor,
  summaryText,
  historyText,
  isState as isGradientState,
} from './types';
export type {
  CssGradientOptions,
  GradientValidation,
  HistoryEntry,
  StopMode,
  StopUnit,
  ToolState,
} from './types';
