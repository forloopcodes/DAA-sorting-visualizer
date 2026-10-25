// Builds replayable timelines with keyframes, counters and per-step pointer snapshots.
// Step lookup, narration sentences and the value-to-colour ramp live here.
const K = 128

const clone = (s) => ({ ...s, arr: [...s.arr], done: Uint8Array.from(s.done) })

function apply(s, o) {
  switch (o.t) {
    case 'swap': [s.arr[o.a], s.arr[o.b]] = [s.arr[o.b], s.arr[o.a]]; break
    case 'set': s.arr[o.i] = o.v; break
    case 'sort': s.done[o.i] = 1; break
    case 'pivot': s.pivot = o.i; break
    case 'range': s.lo = o.lo; s.hi = o.hi; break
  }
}

export function buildTimeline(base, ops) {
  const n = base.length
  const s = { arr: [...base], done: new Uint8Array(n), pivot: -1, lo: 0, hi: n - 1 }
  const frames = [clone(s)]
  const cmps = new Uint32Array(ops.length + 1)
  const writes = new Uint32Array(ops.length + 1)
  const ptrs = new Array(ops.length + 1)
  ptrs[0] = {}
  ops.forEach((o, i) => {
    apply(s, o)
    ptrs[i + 1] = o.p ?? ptrs[i]
    cmps[i + 1] = cmps[i] + (o.t === 'cmp')
    writes[i + 1] = writes[i] + (o.t === 'swap' ? 2 : o.t === 'set' ? 1 : 0)
    if ((i + 1) % K === 0) frames.push(clone(s))
  })
  return { ops, frames, cmps, writes, ptrs, total: ops.length }
}

export function stateAt(tl, k) {
  const f = Math.floor(k / K)
  const s = clone(tl.frames[f])
  for (let i = f * K; i < k; i++) apply(s, tl.ops[i])
  return s
}

export function narrate(tl, k, s) {
  if (k === 0) return 'Press play or step forward.'
  if (k === tl.total) return 'Sorted: every bar is final.'
  const o = tl.ops[k - 1]
  const v = (i) => s.arr[i]
  switch (o.t) {
    case 'cmp': return `Compare ${v(o.a)} and ${v(o.b)}.`
    case 'swap': return `Swap ${v(o.b)} and ${v(o.a)}.`
    case 'set': return `Write ${o.v} to position ${o.i + 1}.`
    case 'sort': return `${v(o.i)} is in its final position.`
    case 'pivot': return o.i < 0 ? 'Pivot cleared.' : `${v(o.i)} is now the pivot.`
    case 'range': return `Working on positions ${o.lo + 1} to ${o.hi + 1}.`
  }
}

const RAMP = [[63, 42, 140], [47, 111, 208], [31, 163, 163], [124, 203, 91], [233, 184, 36]]
export function barColor(t) {
  const x = t * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(x))
  const f = x - i
  return `rgb(${[0, 1, 2].map((c) => Math.round(RAMP[i][c] + (RAMP[i + 1][c] - RAMP[i][c]) * f)).join(',')})`
}
