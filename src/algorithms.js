// Six sorting algorithms with recorders, metadata, code listings and data generators.
// Runs record comparisons, swaps, writes, ranges and live loop pointers.
function recorder(n) {
  const ops = []
  const done = new Set()
  const ptr = {}
  const add = (o) => ops.push({ ...o, p: { ...ptr } })
  return {
    ptr,
    cmp: (a, b, l) => add({ t: 'cmp', a, b, l }),
    swap: (a, b, l) => a !== b && add({ t: 'swap', a, b, l }),
    set: (i, v, l) => add({ t: 'set', i, v, l }),
    sort: (i, l) => (done.add(i), add({ t: 'sort', i, l })),
    pivot: (i, l) => add({ t: 'pivot', i, l }),
    range: (lo, hi, l) => add({ t: 'range', lo, hi, l }),
    finish() {
      for (const name in ptr) delete ptr[name]
      add({ t: 'range', lo: 0, hi: n - 1 })
      add({ t: 'pivot', i: -1 })
      for (let i = 0; i < n; i++) if (!done.has(i)) this.sort(i)
      return ops
    },
  }
}

const swapIn = (a, i, j) => ([a[i], a[j]] = [a[j], a[i]])

function bubble(src) {
  const a = [...src], n = a.length, r = recorder(n), pt = r.ptr
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    pt.i = i
    r.range(0, n - 1 - i, 0)
    for (let j = 0; j < n - 1 - i; j++) {
      pt.j = j
      r.cmp(j, j + 1, 3)
      if (a[j] > a[j + 1]) { swapIn(a, j, j + 1); r.swap(j, j + 1, 4); swapped = true }
    }
    delete pt.j
    r.sort(n - 1 - i, 6)
    if (!swapped) break
  }
  return r.finish()
}

function selection(src) {
  const a = [...src], n = a.length, r = recorder(n), pt = r.ptr
  for (let i = 0; i < n - 1; i++) {
    let m = i
    pt.i = i
    r.range(i, n - 1, 0)
    pt.min = m
    r.pivot(m, 1)
    for (let j = i + 1; j < n; j++) {
      pt.j = j
      r.cmp(j, m, 3)
      if (a[j] < a[m]) { m = j; pt.min = m; r.pivot(m, 4) }
    }
    delete pt.j
    swapIn(a, i, m); r.swap(i, m, 5)
    r.sort(i, 6)
  }
  return r.finish()
}

function insertion(src) {
  const a = [...src], n = a.length, r = recorder(n), pt = r.ptr
  for (let i = 1; i < n; i++) {
    pt.i = i
    r.range(0, i, 0)
    for (let j = i; j > 0; j--) {
      pt.j = j
      r.cmp(j - 1, j, 2)
      if (a[j - 1] <= a[j]) break
      swapIn(a, j - 1, j); r.swap(j - 1, j, 3)
    }
    delete pt.j
  }
  return r.finish()
}

function merge(src) {
  const a = [...src], n = a.length, r = recorder(n), pt = r.ptr
  const go = (lo, hi) => {
    if (lo >= hi) return
    const mid = (lo + hi) >> 1
    go(lo, mid); go(mid + 1, hi)
    pt.lo = lo; pt.mid = mid; pt.hi = hi
    r.range(lo, hi, 5)
    const out = []
    let i = lo, j = mid + 1
    while (i <= mid && j <= hi) { pt.i = i; pt.j = j; r.cmp(i, j, 7); out.push(a[i] <= a[j] ? a[i++] : a[j++]) }
    while (i <= mid) out.push(a[i++])
    while (j <= hi) out.push(a[j++])
    delete pt.i; delete pt.j
    out.forEach((v, k) => { a[lo + k] = v; r.set(lo + k, v, 9) })
  }
  go(0, n - 1)
  return r.finish()
}

function quick(src) {
  const a = [...src], n = a.length, r = recorder(n), pt = r.ptr
  const go = (lo, hi) => {
    delete pt.j; delete pt.p
    if (lo > hi) return
    pt.lo = lo; pt.hi = hi
    if (lo === hi) { r.sort(lo, 6); return }
    r.range(lo, hi, 1); r.pivot(hi, 1)
    let p = lo
    pt.p = p
    for (let j = lo; j < hi; j++) {
      pt.j = j
      r.cmp(j, hi, 3)
      if (a[j] < a[hi]) { swapIn(a, p, j); r.swap(p, j, 4); p++; pt.p = p }
    }
    delete pt.j
    swapIn(a, p, hi); r.swap(p, hi, 5)
    r.pivot(p, 6); r.sort(p, 6)
    go(lo, p - 1); go(p + 1, hi)
  }
  go(0, n - 1)
  return r.finish()
}

function heap(src) {
  const a = [...src], n = a.length, r = recorder(n), pt = r.ptr
  const sift = (i, size) => {
    for (;;) {
      pt.i = i
      let big = i
      const l = 2 * i + 1, rt = l + 1
      delete pt.l; delete pt.r
      if (l < size) { pt.l = l; r.cmp(l, big, 7); if (a[l] > a[big]) big = l }
      if (rt < size) { pt.r = rt; r.cmp(rt, big, 8); if (a[rt] > a[big]) big = rt }
      if (big === i) return
      swapIn(a, i, big); r.swap(i, big, 10); i = big
    }
  }
  r.range(0, n - 1, 0)
  for (let i = (n >> 1) - 1; i >= 0; i--) sift(i, n)
  for (let end = n - 1; end > 0; end--) {
    pt.end = end
    swapIn(a, 0, end); r.swap(0, end, 2); r.sort(end, 3)
    r.range(0, end - 1, 1)
    sift(0, end)
  }
  return r.finish()
}

const CODE = {
  bubble: [
    'for i in 0 .. n-2:',
    '  swapped = false',
    '  for j in 0 .. n-2-i:',
    '    if a[j] > a[j+1]:',
    '      swap(a[j], a[j+1])',
    '      swapped = true',
    '  a[n-1-i] is final',
    '  if not swapped: stop',
  ],
  selection: [
    'for i in 0 .. n-2:',
    '  min = i',
    '  for j in i+1 .. n-1:',
    '    if a[j] < a[min]:',
    '      min = j',
    '  swap(a[i], a[min])',
    '  a[i] is final',
  ],
  insertion: [
    'for i in 1 .. n-1:',
    '  j = i',
    '  while j > 0 and a[j-1] > a[j]:',
    '    swap(a[j-1], a[j])',
    '    j = j - 1',
  ],
  merge: [
    'mergeSort(lo, hi):',
    '  if lo >= hi: return',
    '  mid = (lo + hi) / 2',
    '  mergeSort(lo, mid)',
    '  mergeSort(mid+1, hi)',
    '  i = lo; j = mid+1',
    '  while i <= mid and j <= hi:',
    '    take smaller of a[i], a[j]',
    '  copy what is left of a half',
    '  write buffer back to a[lo..hi]',
  ],
  quick: [
    'quickSort(lo, hi):',
    '  pivot = a[hi]; p = lo',
    '  for j in lo .. hi-1:',
    '    if a[j] < pivot:',
    '      swap(a[p], a[j]); p++',
    '  swap(a[p], a[hi])',
    '  a[p] is final',
    '  quickSort(lo, p-1)',
    '  quickSort(p+1, hi)',
  ],
  heap: [
    'buildMaxHeap(a)',
    'for end in n-1 .. 1:',
    '  swap(a[0], a[end])',
    '  a[end] is final',
    '  siftDown(0, end)',
    'siftDown(i, size):',
    '  big = i; l = 2i+1; r = 2i+2',
    '  if a[l] > a[big]: big = l',
    '  if a[r] > a[big]: big = r',
    '  if big == i: return',
    '  swap(a[i], a[big]); i = big',
  ],
}

const META = [
  { id: 'bubble', name: 'Bubble sort', run: bubble, best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes',
    about: 'Walks along the list swapping neighbours that are out of order. Each pass carries the largest remaining value to the end.' },
  { id: 'selection', name: 'Selection sort', run: selection, best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'No',
    about: 'Scans the unsorted part for the smallest value (the diamond), then swaps it to the front. Few swaps, many comparisons.' },
  { id: 'insertion', name: 'Insertion sort', run: insertion, best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes',
    about: 'Takes the next value and slides it left until it sits in order. Very fast when the list is already nearly sorted.' },
  { id: 'merge', name: 'Merge sort', run: merge, best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: 'Yes',
    about: 'Splits the list in half, sorts each half, then merges the two sorted halves into a buffer and copies the result back.' },
  { id: 'quick', name: 'Quick sort', run: quick, best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: 'No',
    about: 'Picks the last value as the pivot (the diamond), moves smaller values before it, then sorts each side. Sorted input is its worst case.' },
  { id: 'heap', name: 'Heap sort', run: heap, best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: 'No',
    about: 'Arranges the list as a max-heap, then repeatedly swaps the largest value to the end and repairs the heap.' },
]
export const ALGOS = META.map((m) => ({ ...m, code: CODE[m.id] }))

export const PATTERNS = [
  { id: 'random', name: 'Random' },
  { id: 'sorted', name: 'Already sorted' },
  { id: 'nearly', name: 'Nearly sorted' },
  { id: 'reversed', name: 'Reversed' },
  { id: 'few', name: 'Few unique values' },
]

export function makeData(n, pattern, seed) {
  let s = seed >>> 0
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const a = Array.from({ length: n }, (_, i) => i + 1)
  const shuffle = (x) => {
    for (let i = x.length - 1; i > 0; i--) swapIn(x, i, Math.floor(rnd() * (i + 1)))
    return x
  }
  if (pattern === 'sorted') return a
  if (pattern === 'reversed') return a.reverse()
  if (pattern === 'nearly') {
    for (let k = 0; k < Math.max(2, n / 10); k++) {
      const i = Math.floor(rnd() * n)
      swapIn(a, i, Math.min(n - 1, i + 1 + Math.floor(rnd() * 3)))
    }
    return a
  }
  if (pattern === 'few') return shuffle(a.map((v) => Math.ceil((v / n) * 4) * Math.round(n / 4)))
  return shuffle(a)
}
