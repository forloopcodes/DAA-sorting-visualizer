// Numbers about an array, and a prediction for how each algorithm will treat it.
const fmt = (x) => Math.round(x).toLocaleString()

// Inversions = pairs that are in the wrong order. 0 means sorted.
export function analyse(arr) {
  const n = arr.length
  let inv = 0, runs = n ? 1 : 0
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (arr[i] > arr[j]) inv++
  for (let i = 1; i < n; i++) if (arr[i] < arr[i - 1]) runs++
  return { n, inv, pairs: (n * (n - 1)) / 2, runs, distinct: new Set(arr).size, min: Math.min(...arr), max: Math.max(...arr) }
}

// Counts for a finished run: a swap is two array writes, a set is one.
export function totals(ops) {
  let c = 0, w = 0
  for (const o of ops) o.t === 'cmp' ? c++ : o.t === 'swap' ? (w += 2) : o.t === 'set' && w++
  return { c, w }
}

// One sentence tying the algorithm to this particular starting array.
export function insight(id, a0, t) {
  const n = a0.n, lg = Math.log2(n)
  switch (id) {
    case 'bubble':
      return `Every swap removes exactly one inversion (a pair in the wrong order). This array starts with ${fmt(a0.inv)}, so the run makes ${fmt(a0.inv)} swaps. It still makes ${fmt(t.c)} comparisons because every pass rescans the unsorted part.`
    case 'insertion':
      return `Every swap removes exactly one inversion, so the work follows the disorder: ${fmt(a0.inv)} inversions means ${fmt(a0.inv)} swaps and ${fmt(t.c)} comparisons. The closer the array is to sorted, the cheaper this gets.`
    case 'selection':
      return `Comparisons are fixed at n(n−1)/2 = ${fmt(a0.pairs)} whatever the order, but it never swaps more than n−1 times. This run made ${fmt(t.w / 2)} swaps.`
    case 'merge':
      return `Splits are always balanced, so comparisons never exceed n·log₂n rounded up = ${fmt(n * Math.ceil(lg))}. This run used ${fmt(t.c)}. The price is a buffer of up to ${fmt(n)} extra values.`
    case 'quick':
      return a0.inv === 0
        ? `The last value is always the pivot, and this array is already sorted: every partition peels off a single value, so comparisons reach the worst case of n(n−1)/2 = ${fmt(a0.pairs)}. This run used ${fmt(t.c)}.`
        : `The last value is always the pivot, so sorted or reversed input splits lopsidedly and pushes comparisons towards n(n−1)/2 = ${fmt(a0.pairs)}. A balanced run needs about n·log₂n = ${fmt(n * lg)}. This run used ${fmt(t.c)}.`
    case 'heap':
      return `Heap sort ignores the starting order: it needs roughly 2n·log₂n = ${fmt(2 * n * lg)} comparisons on any input. This run used ${fmt(t.c)}.`
  }
}
