// Replays every algorithm on every pattern and size; fails if the end state is not the sorted input.
// (Mid-run states are not checked as permutations: merge sort copies its buffer back one write at a time.)
import { ALGOS, PATTERNS, makeData } from '../src/algorithms.js'
import { buildTimeline, stateAt } from '../src/timeline.js'
import { analyse, totals } from '../src/analysis.js'

let bad = 0
const fail = (...m) => { bad++; console.log('FAIL', ...m) }
for (const al of ALGOS) for (const p of PATTERNS) for (const n of [2, 3, 8, 33, 120]) {
  const base = makeData(n, p.id, 7 + n)
  const tl = buildTimeline(base, al.run(base))
  const end = stateAt(tl, tl.total)
  const mid = stateAt(tl, Math.floor(tl.total / 2))
  const ok = end.arr.every((v, i) => i === 0 || end.arr[i - 1] <= v) &&
    end.done.every((d) => d === 1) && mid.arr.length === n &&
    [...end.arr].join() === [...base].sort((x, y) => x - y).join()
  if (!ok) fail(al.id, p.id, n)
  // Every op that names a code line must point inside that algorithm's listing.
  for (const o of tl.ops) if (o.l !== undefined && !(o.l >= 0 && o.l < al.code.length)) fail('line out of range', al.id, o)
  // Claims the "What to notice" text makes about this array.
  const a0 = analyse(base), t = totals(tl.ops)
  if ((al.id === 'bubble' || al.id === 'insertion') && t.w !== 2 * a0.inv) fail('swaps != inversions', al.id, p.id, n)
  if (al.id === 'selection' && t.c !== a0.pairs) fail('selection comparisons', p.id, n)
  if (al.id === 'merge' && t.c > n * Math.ceil(Math.log2(n))) fail('merge bound', p.id, n)
  if (al.id === 'quick' && p.id === 'sorted' && t.c !== a0.pairs) fail('quick worst case on sorted', n)
}
// Print which code line each kind of op lands on, to review the mapping by eye.
if (process.argv.includes('--trace')) for (const al of ALGOS) {
  const base = makeData(12, 'random', 3), seen = new Map()
  for (const o of al.run(base)) if (o.l !== undefined) seen.set(`${o.t}@${o.l}`, al.code[o.l].trim())
  console.log(`\n${al.name}`); for (const [k, v] of seen) console.log(`  ${k.padEnd(9)} ${v}`)
}

console.log(bad ? `${bad} failures` : `All ${ALGOS.length} algorithms sort ${PATTERNS.length} patterns at 5 sizes.`)
process.exit(bad ? 1 : 0)

