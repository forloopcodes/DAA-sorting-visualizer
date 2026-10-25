# Sorting, step by step

Interactive visualization of six sorting algorithms (bubble, selection, insertion, merge, quick, heap) in React + Vite.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

## Check it

```bash
npm run check                                   # every algorithm sorts every pattern at 5 sizes; checks the claims the analysis text makes
npm run build && npx vite preview --port 4173   # then, in another terminal:
pip install playwright && playwright install chromium
python3 scripts/verify-layout.py                # screenshots + alignment measurements at 3 screen sizes
```

## How it works

| File | Job |
| --- | --- |
| `src/algorithms.js` | Each algorithm runs once and records its moves (compare, swap, write, mark final, pivot, range). Every move also records the line of the code listing that performs it. Also the code listings and data generators. |
| `src/analysis.js` | Array analysis: inversions, ascending runs, distinct values; totals for a run; and the "On this array" sentence for each algorithm. |
| `src/timeline.js` | Turns the recorded moves into a timeline with snapshots every 128 steps, so any step can be rebuilt instantly (that is what makes step back and the scrubber cheap). Also the sentence shown under the stage and the value-to-colour ramp. |
| `src/App.jsx` | Stage, tabs, transport and sidebar. Each column holds its bar, markers and progress rail together, so they cannot drift apart. |
| `src/index.css` | Design tokens and layout. |
| `scripts/` | The two verification scripts. |

## Add an algorithm

Write a function in `algorithms.js` that takes an array and returns a list of moves (copy `bubble` as a template). Pass each move the index of the line in its `CODE` listing, add a `META` entry, and run `npm run check` (`--trace` prints which code line each kind of move lands on).
