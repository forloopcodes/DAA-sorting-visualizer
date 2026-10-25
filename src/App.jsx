// Stage, transport, settings sidebar and analysis tables for the visualizer.
// Renders bars, values, pointer labels and each playback control here.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ALGOS, PATTERNS, makeData } from './algorithms'
import { buildTimeline, stateAt, narrate, barColor } from './timeline'
import { analyse, totals, insight } from './analysis'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={d} fill="currentColor" /></svg>
)
const ICONS = {
  reset: 'M6 5h2v14H6zM20 5v14L9 12z',
  back: 'M15 5v14L6 12z M17 5h2v14h-2z',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  next: 'M9 5v14l9-7z M5 5h2v14H5z',
  end: 'M4 5v14l11-7zM17 5h3v14h-3z',
}

export default function App() {
  const [algoId, setAlgoId] = useState('quick')
  const [size, setSize] = useState(40)
  const [pattern, setPattern] = useState('random')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [speed, setSpeed] = useState(50)
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)

  const algo = ALGOS.find((a) => a.id === algoId)
  const base = useMemo(() => makeData(size, pattern, seed), [size, pattern, seed])
  const tl = useMemo(() => buildTimeline(base, algo.run(base)), [base, algo])
  const s = useMemo(() => stateAt(tl, k), [tl, k])
  const now = useMemo(() => analyse(s.arr), [s])
  const start = useMemo(() => analyse(base), [base])
  const everyAlgo = useMemo(() => ALGOS.map((a) => ({ id: a.id, name: a.name.replace(' sort', ''), ...totals(a.run(base)) })), [base])
  const mine = everyAlgo.find((a) => a.id === algoId)
  const sps = Math.round(2 ** (speed / 11))

  const boxRef = useRef(null)
  const [boxW, setBoxW] = useState(0)
  useLayoutEffect(() => {
    const el = boxRef.current
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el); setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const gap = size > 70 ? 1 : size > 36 ? 2 : 4
  const barW = Math.max(1, Math.floor((boxW - gap * (size - 1)) / size))
  const colsW = boxW ? size * barW + gap * (size - 1) : 0
  const showNums = barW >= 14

  const fresh = (fn) => (...args) => { fn(...args); setK(0); setPlaying(false) }

  useEffect(() => {
    if (!playing) return
    let last = performance.now(), acc = 0, id
    const tick = (t) => {
      acc += Math.max(0, (t - last) / 1000) * sps
      last = t
      const adv = Math.floor(acc)
      if (adv > 0) { acc -= adv; setK((c) => Math.min(c + adv, tl.total)) }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, sps, tl.total])
  useEffect(() => { if (k >= tl.total) setPlaying(false) }, [k, tl.total])

  const go = (n) => { setPlaying(false); setK(Math.max(0, Math.min(tl.total, n))) }
  const togglePlay = () => { if (k >= tl.total) setK(0); setPlaying((p) => !p) }

  const op = k > 0 ? tl.ops[k - 1] : null
  const line = op?.l ?? -1
  const hot = {}
  if (op?.t === 'cmp') hot[op.a] = hot[op.b] = 'cmp'
  if (op?.t === 'swap') hot[op.a] = hot[op.b] = 'write'
  if (op?.t === 'set') hot[op.i] = 'write'

  const chips = []
  const lanes = [-Infinity, -Infinity, -Infinity]
  if (colsW) {
    for (const [name, at] of Object.entries(tl.ptrs[k]).sort((a, b) => a[1] - b[1])) {
      const x = at * (barW + gap) + barW / 2
      const w = name.length * 7 + 10
      let lane = lanes.findIndex((right) => x - w / 2 > right)
      if (lane < 0) lane = lanes.indexOf(Math.min(...lanes))
      lanes[lane] = x + w / 2
      chips.push({ name, at, x, lane })
    }
  }

  const lo = Math.min(...base), hi = Math.max(...base)
  const pct = (v, min, max) => `${((v - min) / (max - min)) * 100}%`

  return (
    <div className="app">
      <header className="head">
        <h1>Sorting, step by step</h1>
        <p>Six algorithms, one list. Pick one, press play, and watch every comparison and swap.</p>
      </header>

      <main className="main">
        <div className="tabs" role="tablist" aria-label="Algorithm">
          {ALGOS.map((a) => (
            <button key={a.id} role="tab" aria-selected={a.id === algoId} className="tab"
              onClick={fresh(() => setAlgoId(a.id))}>{a.name.replace(' sort', '')}</button>
          ))}
        </div>

        <section className="stage" aria-label="Array visualisation">
          <div className="colsbox" ref={boxRef}>
            <div className="cols" style={{ '--gap': `${gap}px`, '--bw': `${barW}px`, width: colsW || '100%' }}>
              {s.arr.map((v, i) => {
                const inRange = i >= s.lo && i <= s.hi
                const color = hot[i] === 'cmp' ? 'var(--ink)' : hot[i] === 'write' ? 'var(--signal)' : barColor((v - lo) / (hi - lo || 1))
                return (
                  <div key={i} className={`col${inRange ? '' : ' out'}`} title={`Position ${i + 1}: ${v}`}>
                    <div className="barwrap">
                      <div className="bar" style={{ height: `${(v / hi) * 100}%`, background: color }} />
                    </div>
                    <div className="mark">{hot[i] && <i className={`tri ${hot[i]}`} />}</div>
                    <div className="mark">{s.pivot === i && <i className="dia" />}</div>
                    <div className={`rail${s.done[i] ? ' on' : ''}`} />
                    {showNums && <div className="num">{v}</div>}
                  </div>
                )
              })}
            </div>
            <div className="pointers" style={{ width: colsW || '100%' }}>
              {chips.map((c) => (
                <span key={c.name} className="ptr" title={`${c.name} = position ${c.at + 1}`} style={{ left: c.x, top: c.lane * 20 }}>{c.name}</span>
              ))}
            </div>
          </div>
          <ul className="legend">
            <li><i className="sw" style={{ background: 'var(--ink)' }} />Comparing</li>
            <li><i className="sw" style={{ background: 'var(--signal)' }} />Swapping or writing</li>
            <li><i className="sw dia" />Pivot or current minimum</li>
            <li><i className="sw line" />Final position</li>
            <li><i className="sw fade" />Outside the current range</li>
          </ul>
        </section>

        <div className="nowrow">
          <p className="now" aria-live="polite">{narrate(tl, k, s)}</p>
          <dl className="counts">
            <div><dt>Comparisons</dt><dd>{tl.cmps[k].toLocaleString()}</dd></div>
            <div><dt>Array writes</dt><dd>{tl.writes[k].toLocaleString()}</dd></div>
          </dl>
        </div>

        <div className="transport">
          <div className="btns">
            <button className="btn" aria-label="Back to start" title="Back to start" onClick={() => go(0)}><Icon d={ICONS.reset} /></button>
            <button className="btn" aria-label="Step back" title="Step back" onClick={() => go(k - 1)}><Icon d={ICONS.back} /></button>
            <button className="btn primary" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'} onClick={togglePlay}>
              <Icon d={playing ? ICONS.pause : ICONS.play} />
            </button>
            <button className="btn" aria-label="Step forward" title="Step forward" onClick={() => go(k + 1)}><Icon d={ICONS.next} /></button>
            <button className="btn" aria-label="Jump to end" title="Jump to end" onClick={() => go(tl.total)}><Icon d={ICONS.end} /></button>
          </div>
          <input type="range" className="scrub" aria-label="Position in the run" min={0} max={tl.total} value={k}
            style={{ '--p': pct(k, 0, tl.total || 1) }} onChange={(e) => go(+e.target.value)} />
          <output className="stepout">{k.toLocaleString()} / {tl.total.toLocaleString()}</output>
        </div>

        <div className="note">
          <h3>On this array</h3>
          <p>{insight(algoId, start, mine)}</p>
        </div>
      </main>

      <aside className="side">
        <section>
          <h2>{algo.name}</h2>
          <p className="about">{algo.about}</p>
        </section>

        <section>
          <h3>Code</h3>
          <div className="code" role="region" aria-label={`${algo.name} code`}>
            {algo.code.map((text, i) => (
              <div key={i} className={`ln${i === line ? ' on' : ''}`} aria-current={i === line ? 'step' : undefined}>
                <b>{i + 1}</b><span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>Settings</h3>
          <label className="field">
            <span className="fl"><span>Speed</span><span>{sps.toLocaleString()} steps/s</span></span>
            <input type="range" min={1} max={100} value={speed} style={{ '--p': pct(speed, 1, 100) }} onChange={(e) => setSpeed(+e.target.value)} />
          </label>
          <label className="field">
            <span className="fl"><span>Array size</span><span>{size}</span></span>
            <input type="range" min={8} max={120} value={size} style={{ '--p': pct(size, 8, 120) }} onChange={fresh((e) => setSize(+e.target.value))} />
          </label>
          <label className="field">
            <span className="fl"><span>Starting order</span></span>
            <select value={pattern} onChange={fresh((e) => setPattern(e.target.value))}>
              {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <button className="wide" onClick={fresh(() => setSeed(Math.floor(Math.random() * 1e9)))}>New array</button>
        </section>
      </aside>

      <section className="lower" aria-label="Array analysis">
        <div className="lowl">
          <div>
            <h3>Array now</h3>
            <dl className="kv">
              <dt>Inversions left</dt><dd>{now.inv.toLocaleString()} of {now.pairs.toLocaleString()}</dd>
              <dt>Ascending runs</dt><dd>{now.runs}</dd>
              <dt>Distinct values</dt><dd>{now.distinct}</dd>
              <dt>Smallest to largest</dt><dd>{now.min} to {now.max}</dd>
            </dl>
          </div>
          <div>
            <h3>{algo.name} complexity</h3>
            <dl className="kv">
              <dt>Best case</dt><dd>{algo.best}</dd>
              <dt>Average case</dt><dd>{algo.avg}</dd>
              <dt>Worst case</dt><dd>{algo.worst}</dd>
              <dt>Extra space</dt><dd>{algo.space}</dd>
              <dt>Stable</dt><dd>{algo.stable}</dd>
            </dl>
          </div>
        </div>
        <div className="lowr">
          <h3>All six, same array</h3>
          <table className="cmp">
            <thead><tr><th scope="col">Algorithm</th><th scope="col">Comparisons</th><th scope="col">Array writes</th></tr></thead>
            <tbody>
              {everyAlgo.map((a) => (
                <tr key={a.id} aria-current={a.id === algoId ? 'true' : undefined}>
                  <th scope="row">{a.name}</th><td>{a.c.toLocaleString()}</td><td>{a.w.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
