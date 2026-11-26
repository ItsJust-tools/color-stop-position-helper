# Color Stop Position Helper

Splits a linear-gradient into evenly or weighted color stops and shows the exact CSS stop percentages with a live preview bar.

**Live:** [color-stop-position-helper.itsjust.tools](https://color-stop-position-helper.itsjust.tools)

## Features

- Enter a number of colors (2–12) and auto-distribute even stop percentages
- Weighted mode: drag any interior stop and the neighbors rebalance linearly (endpoints stay pinned at 0% and 100%)
- Live preview gradient bar with tick marks and percentage labels at every stop
- Copy-ready CSS output for `linear-gradient` with percent or px positions
- Angle input (0–360deg) reflected in the CSS snippet — values wrap into range
- Reverse and rotate-palette actions that recompute positions
- Gradient state persists in the shareable URL for sharing
- Keyboard-accessible color inputs with hex validation
- 100% client-side — no data ever leaves your browser

## Usage

1. Pick the number of stops (2–12) — positions distribute evenly by default
2. Switch to **Weighted** mode and drag an interior stop to rebalance neighbors
3. Adjust the angle slider or type an angle value (0–360deg)
4. Toggle percent or px positions and copy the CSS snippet from the output panel

## Development

```bash
npm ci
npm run dev
```

Run the tests:

```bash
CI=true npm test -- --coverage
```

Build for production:

```bash
npm run build
```

## Docker

```bash
docker build -t itsjust-color-stop-position-helper .
docker run -p 3000:3000 itsjust-color-stop-position-helper
```

## License

MIT
