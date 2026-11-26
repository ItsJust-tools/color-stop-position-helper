import type { ToolConfig } from '@itsjust/core';

export const toolConfig = {
  id: 'color-stop-position-helper',
  name: 'Color Stop Position Helper',
  description:
    'Splits a linear-gradient into evenly or weighted color stops and shows the exact CSS stop percentages with a live preview bar.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#a855f7',
    accentHover: '#9333ea',
    accentSubtle: 'rgba(168, 85, 247, 0.08)',
    brand: 'Color Stop Position Helper',
    icon: '🌈',
  },
  shortcuts: [
    {
      title: 'Color Stop Position Helper',
      shortcuts: [
        {
          keys: 'Ctrl+Shift+C',
          label: 'Copy CSS',
          description: 'copy the ready-to-paste linear-gradient CSS',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
